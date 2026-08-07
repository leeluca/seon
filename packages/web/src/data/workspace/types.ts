import type { StorageBackend } from '~/data/db/storage';

export const WORKSPACE_DESCRIPTOR_VERSION = 1 as const;
export const WORKSPACE_DATABASE_PREFIX = 'seon-workspace-';

export interface WorkspaceSyncBinding {
  provider: string;
  ownerAccountId: string;
  remoteWorkspaceId?: string;
}

interface WorkspaceDescriptorBase {
  version: typeof WORKSPACE_DESCRIPTOR_VERSION;
  id: string;
  /** Stable identifier used to make this browser workspace's uploads idempotent. */
  clientId: string;
  databaseFilename: string;
  storageBackend: StorageBackend;
  createdAt: string;
  updatedAt: string;
}

export interface LocalWorkspaceDescriptor extends WorkspaceDescriptorBase {
  kind: 'local';
  syncBinding: null;
}

export interface AccountWorkspaceDescriptor extends WorkspaceDescriptorBase {
  kind: 'account';
  syncBinding: WorkspaceSyncBinding;
}

export type WorkspaceDescriptor =
  | LocalWorkspaceDescriptor
  | AccountWorkspaceDescriptor;

export interface CreateWorkspaceDescriptorOptions {
  storageBackend: StorageBackend;
  syncBinding?: WorkspaceSyncBinding | null;
  idFactory?: () => string;
  now?: () => Date;
}

export function workspaceDatabaseFilename(workspaceId: string): string {
  return `${WORKSPACE_DATABASE_PREFIX}${workspaceId}.db`;
}

export function createWorkspaceDescriptor({
  storageBackend,
  syncBinding = null,
  idFactory = () => crypto.randomUUID(),
  now = () => new Date(),
}: CreateWorkspaceDescriptorOptions): WorkspaceDescriptor {
  const id = idFactory();
  const timestamp = now().toISOString();
  const base: WorkspaceDescriptorBase = {
    version: WORKSPACE_DESCRIPTOR_VERSION,
    id,
    clientId: idFactory(),
    databaseFilename: workspaceDatabaseFilename(id),
    storageBackend,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return syncBinding
    ? { ...base, kind: 'account', syncBinding }
    : { ...base, kind: 'local', syncBinding: null };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isUuid(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isSyncBinding(value: unknown): value is WorkspaceSyncBinding {
  if (!value || typeof value !== 'object') return false;
  const binding = value as Record<string, unknown>;

  return (
    isNonEmptyString(binding.provider) &&
    isNonEmptyString(binding.ownerAccountId) &&
    (binding.remoteWorkspaceId === undefined ||
      isNonEmptyString(binding.remoteWorkspaceId))
  );
}

export function isWorkspaceDescriptor(
  value: unknown,
): value is WorkspaceDescriptor {
  if (!value || typeof value !== 'object') return false;
  const descriptor = value as Record<string, unknown>;

  if (
    descriptor.version !== WORKSPACE_DESCRIPTOR_VERSION ||
    !isUuid(descriptor.id) ||
    !isUuid(descriptor.clientId) ||
    descriptor.databaseFilename !==
      workspaceDatabaseFilename(String(descriptor.id)) ||
    (descriptor.storageBackend !== 'opfs' &&
      descriptor.storageBackend !== 'indexeddb') ||
    !isNonEmptyString(descriptor.createdAt) ||
    !isNonEmptyString(descriptor.updatedAt)
  ) {
    return false;
  }

  if (descriptor.kind === 'local') return descriptor.syncBinding === null;
  if (descriptor.kind === 'account') {
    return isSyncBinding(descriptor.syncBinding);
  }

  return false;
}

export function assertWorkspaceDescriptor(
  value: unknown,
): asserts value is WorkspaceDescriptor {
  if (!isWorkspaceDescriptor(value)) {
    throw new Error('Invalid workspace descriptor');
  }
}
