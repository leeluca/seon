import type { StorageBackend } from '~/data/db/storage';
import type { WorkspaceRegistryStorage } from './registryStorage';
import {
  assertWorkspaceDescriptor,
  createWorkspaceDescriptor,
  type WorkspaceDescriptor,
  type WorkspaceSyncBinding,
} from './types';

const WORKSPACE_REGISTRY_VERSION = 1 as const;
const WORKSPACE_REGISTRY_LOCK = 'seon-workspace-registry-update';

interface WorkspaceRegistryState {
  version: typeof WORKSPACE_REGISTRY_VERSION;
  activeWorkspace: WorkspaceDescriptor | null;
  retiredWorkspaces: WorkspaceDescriptor[];
}

export class WorkspaceRegistryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceRegistryConflictError';
  }
}

function emptyState(): WorkspaceRegistryState {
  return {
    version: WORKSPACE_REGISTRY_VERSION,
    activeWorkspace: null,
    retiredWorkspaces: [],
  };
}

function parseState(value: unknown): WorkspaceRegistryState {
  if (value === null) return emptyState();
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid workspace registry state');
  }

  const state = value as Record<string, unknown>;
  if (state.version !== WORKSPACE_REGISTRY_VERSION) {
    throw new Error('Unsupported workspace registry version');
  }
  if (state.activeWorkspace !== null) {
    assertWorkspaceDescriptor(state.activeWorkspace);
  }
  const retiredWorkspaces = state.retiredWorkspaces ?? [];
  if (!Array.isArray(retiredWorkspaces)) {
    throw new Error('Invalid retired workspace registry state');
  }
  retiredWorkspaces.forEach(assertWorkspaceDescriptor);
  const workspaceIds = new Set(retiredWorkspaces.map(({ id }) => id));
  if (
    workspaceIds.size !== retiredWorkspaces.length ||
    (state.activeWorkspace && workspaceIds.has(state.activeWorkspace.id))
  ) {
    throw new Error('Workspace registry contains duplicate descriptors');
  }

  return {
    version: WORKSPACE_REGISTRY_VERSION,
    activeWorkspace: state.activeWorkspace as WorkspaceDescriptor | null,
    retiredWorkspaces,
  };
}

export interface WorkspaceRegistryOptions {
  idFactory?: () => string;
  now?: () => Date;
}

export class WorkspaceRegistry {
  private updateQueue: Promise<void> = Promise.resolve();
  private readonly idFactory: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly storage: WorkspaceRegistryStorage,
    options: WorkspaceRegistryOptions = {},
  ) {
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
  }

  async getActiveWorkspace(): Promise<WorkspaceDescriptor | null> {
    await this.updateQueue;
    return parseState(await this.storage.load()).activeWorkspace;
  }

  async getRetiredWorkspaces(): Promise<WorkspaceDescriptor[]> {
    await this.updateQueue;
    return parseState(await this.storage.load()).retiredWorkspaces;
  }

  getOrCreateLocalWorkspace(
    storageBackend: StorageBackend,
  ): Promise<WorkspaceDescriptor> {
    return this.update(async (state) => {
      if (state.activeWorkspace) return [state, state.activeWorkspace];

      const workspace = createWorkspaceDescriptor({
        storageBackend,
        idFactory: this.idFactory,
        now: this.now,
      });
      return [{ ...state, activeWorkspace: workspace }, workspace];
    });
  }

  replaceActiveWorkspace(
    workspace: WorkspaceDescriptor,
    expectedActiveWorkspaceId: string | null,
  ): Promise<WorkspaceDescriptor> {
    assertWorkspaceDescriptor(workspace);
    return this.update(async (state) => {
      if ((state.activeWorkspace?.id ?? null) !== expectedActiveWorkspaceId) {
        throw new WorkspaceRegistryConflictError(
          'The active workspace changed before it could be replaced',
        );
      }

      const previous = state.activeWorkspace;
      const retiredWorkspaces =
        previous && previous.id !== workspace.id
          ? [
              ...state.retiredWorkspaces.filter(({ id }) => id !== previous.id),
              previous,
            ]
          : state.retiredWorkspaces;
      return [
        { ...state, activeWorkspace: workspace, retiredWorkspaces },
        workspace,
      ];
    });
  }

  bindActiveWorkspace(
    workspaceId: string,
    syncBinding: WorkspaceSyncBinding,
  ): Promise<WorkspaceDescriptor> {
    return this.update(async (state) => {
      const active = this.requireActiveWorkspace(state, workspaceId);
      const updated: WorkspaceDescriptor = {
        ...active,
        kind: 'account',
        syncBinding,
        updatedAt: this.now().toISOString(),
      };
      return [{ ...state, activeWorkspace: updated }, updated];
    });
  }

  removeActiveWorkspace(workspaceId: string): Promise<WorkspaceDescriptor> {
    return this.update(async (state) => {
      const removed = this.requireActiveWorkspace(state, workspaceId);
      return [{ ...state, activeWorkspace: null }, removed];
    });
  }

  forgetRetiredWorkspace(workspaceId: string): Promise<boolean> {
    return this.update(async (state) => {
      const retiredWorkspaces = state.retiredWorkspaces.filter(
        ({ id }) => id !== workspaceId,
      );
      return [
        retiredWorkspaces.length === state.retiredWorkspaces.length
          ? state
          : { ...state, retiredWorkspaces },
        retiredWorkspaces.length !== state.retiredWorkspaces.length,
      ];
    });
  }

  private requireActiveWorkspace(
    state: WorkspaceRegistryState,
    workspaceId: string,
  ): WorkspaceDescriptor {
    if (state.activeWorkspace?.id !== workspaceId) {
      throw new WorkspaceRegistryConflictError(
        'The requested workspace is not active',
      );
    }
    return state.activeWorkspace;
  }

  private update<T>(
    operation: (
      state: WorkspaceRegistryState,
    ) => Promise<[WorkspaceRegistryState, T]>,
  ): Promise<T> {
    const result = this.updateQueue.then(() =>
      this.withCrossTabLock(async () => {
        const current = parseState(await this.storage.load());
        const [next, value] = await operation(current);
        if (next !== current) await this.storage.save(next);
        return value;
      }),
    );

    this.updateQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async withCrossTabLock<T>(operation: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(WORKSPACE_REGISTRY_LOCK, operation);
    }
    return operation();
  }
}
