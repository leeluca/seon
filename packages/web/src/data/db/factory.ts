import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import {
  PowerSyncDatabase,
  WASQLiteOpenFactory,
  WASQLiteVFS,
} from '@powersync/web';

import { AppSchema, type Database } from './AppSchema';
import { purgeWorkspaceDatabaseStorage } from './storage';
import {
  assertWorkspaceDescriptor,
  type WorkspaceDescriptor,
} from '~/data/workspace/types';

export type WorkspaceKyselyDatabase = ReturnType<
  typeof wrapPowerSyncWithKysely<Database>
>;

export interface WorkspaceDatabaseHandle {
  descriptor: WorkspaceDescriptor;
  powerSyncDb: PowerSyncDatabase;
  db: WorkspaceKyselyDatabase;
}

function createPowerSyncDatabase(
  descriptor: WorkspaceDescriptor,
): PowerSyncDatabase {
  const multiTabEnabled = typeof SharedWorker !== 'undefined';
  const vfs =
    descriptor.storageBackend === 'opfs'
      ? WASQLiteVFS.OPFSCoopSyncVFS
      : WASQLiteVFS.IDBBatchAtomicVFS;

  return new PowerSyncDatabase({
    schema: AppSchema,
    database: new WASQLiteOpenFactory({
      dbFilename: descriptor.databaseFilename,
      vfs,
      flags: { enableMultiTabs: multiTabEnabled },
    }),
    flags: { enableMultiTabs: multiTabEnabled },
  });
}

export class WorkspaceDatabaseFactory {
  private readonly handles = new Map<string, WorkspaceDatabaseHandle>();

  open(descriptor: WorkspaceDescriptor): WorkspaceDatabaseHandle {
    assertWorkspaceDescriptor(descriptor);
    const existing = this.handles.get(descriptor.id);
    if (existing) {
      existing.descriptor = descriptor;
      return existing;
    }

    const powerSyncDb = createPowerSyncDatabase(descriptor);
    const handle: WorkspaceDatabaseHandle = {
      descriptor,
      powerSyncDb,
      db: wrapPowerSyncWithKysely<Database>(powerSyncDb),
    };
    this.handles.set(descriptor.id, handle);
    return handle;
  }

  get(workspaceId: string): WorkspaceDatabaseHandle | undefined {
    return this.handles.get(workspaceId);
  }

  async close(workspaceId: string): Promise<void> {
    const handle = this.handles.get(workspaceId);
    if (!handle) return;

    try {
      await handle.powerSyncDb.disconnect();
    } catch {
      // Closing the database is sufficient when a connector cannot disconnect.
    } finally {
      await handle.powerSyncDb.close();
      this.handles.delete(workspaceId);
    }
  }

  async remove(descriptor: WorkspaceDescriptor): Promise<void> {
    assertWorkspaceDescriptor(descriptor);
    await this.close(descriptor.id);
    await purgeWorkspaceDatabaseStorage(
      descriptor.storageBackend,
      descriptor.databaseFilename,
    );
  }
}
