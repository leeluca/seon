import { describe, expect, it } from 'vitest';

import {
  cleanupRetiredWorkspaces,
  createWorkspaceDescriptor,
  MemoryWorkspaceRegistryStorage,
  WorkspaceRegistry,
  WorkspaceRegistryConflictError,
} from '~/data/workspace';

function createIdFactory() {
  let next = 0;
  return () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`;
}

describe('WorkspaceRegistry', () => {
  it('persists one workspace with stable workspace and client ids', async () => {
    const storage = new MemoryWorkspaceRegistryStorage();
    const idFactory = createIdFactory();
    const registry = new WorkspaceRegistry(storage, {
      idFactory,
      now: () => new Date('2026-07-20T00:00:00.000Z'),
    });

    const created = await registry.getOrCreateLocalWorkspace('opfs');
    const reopened = await new WorkspaceRegistry(storage).getActiveWorkspace();

    expect(created).toEqual({
      version: 1,
      id: '00000000-0000-4000-8000-000000000001',
      clientId: '00000000-0000-4000-8000-000000000002',
      databaseFilename:
        'seon-workspace-00000000-0000-4000-8000-000000000001.db',
      storageBackend: 'opfs',
      kind: 'local',
      syncBinding: null,
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:00:00.000Z',
    });
    expect(reopened).toEqual(created);
    expect(await registry.getOrCreateLocalWorkspace('indexeddb')).toEqual(
      created,
    );
  });

  it('binds the existing local workspace in place', async () => {
    const registry = new WorkspaceRegistry(
      new MemoryWorkspaceRegistryStorage(),
      {
        idFactory: createIdFactory(),
        now: () => new Date('2026-07-20T00:00:00.000Z'),
      },
    );
    const local = await registry.getOrCreateLocalWorkspace('indexeddb');

    const account = await registry.bindActiveWorkspace(local.id, {
      provider: 'powersync',
      ownerAccountId: 'account-1',
    });

    expect(account).toMatchObject({
      id: local.id,
      clientId: local.clientId,
      databaseFilename: local.databaseFilename,
      kind: 'account',
      syncBinding: {
        provider: 'powersync',
        ownerAccountId: 'account-1',
      },
    });
  });

  it('rejects stale replacement and removal attempts', async () => {
    const registry = new WorkspaceRegistry(
      new MemoryWorkspaceRegistryStorage(),
      { idFactory: createIdFactory() },
    );
    const active = await registry.getOrCreateLocalWorkspace('indexeddb');

    await expect(
      registry.replaceActiveWorkspace(active, 'another-workspace'),
    ).rejects.toBeInstanceOf(WorkspaceRegistryConflictError);
    await expect(
      registry.removeActiveWorkspace('another-workspace'),
    ).rejects.toBeInstanceOf(WorkspaceRegistryConflictError);
    expect(await registry.getActiveWorkspace()).toEqual(active);
  });

  it('stores at most one active descriptor', async () => {
    const registry = new WorkspaceRegistry(
      new MemoryWorkspaceRegistryStorage(),
      { idFactory: createIdFactory() },
    );
    const first = await registry.getOrCreateLocalWorkspace('indexeddb');
    await registry.removeActiveWorkspace(first.id);
    const second = await registry.getOrCreateLocalWorkspace('indexeddb');

    expect(second.id).not.toBe(first.id);
    expect(await registry.getActiveWorkspace()).toEqual(second);
  });

  it('persists retired databases until cleanup succeeds', async () => {
    const idFactory = createIdFactory();
    const registry = new WorkspaceRegistry(
      new MemoryWorkspaceRegistryStorage(),
      { idFactory },
    );
    const first = await registry.getOrCreateLocalWorkspace('indexeddb');
    const second = createWorkspaceDescriptor({
      storageBackend: 'indexeddb',
      idFactory,
    });
    await registry.replaceActiveWorkspace(second, first.id);

    let shouldFail = true;
    const databaseFactory = {
      remove: async () => {
        if (shouldFail) throw new Error('database is still open');
      },
    };

    await expect(
      cleanupRetiredWorkspaces({ registry, databaseFactory }),
    ).resolves.toBe(0);
    expect(await registry.getRetiredWorkspaces()).toEqual([first]);

    shouldFail = false;
    await expect(
      cleanupRetiredWorkspaces({ registry, databaseFactory }),
    ).resolves.toBe(1);
    expect(await registry.getRetiredWorkspaces()).toEqual([]);
    expect(await registry.getActiveWorkspace()).toEqual(second);
  });
});
