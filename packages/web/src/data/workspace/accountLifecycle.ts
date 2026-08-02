import type { PowerSyncDatabase } from '@powersync/web';

import fetcher from '~/apis/fetcher';
import {
  activeWorkspace,
  powerSyncDb,
  workspaceDatabaseFactory,
  workspaceRegistry,
} from '~/data/db/database';
import { createWorkspaceOwnerHeaders } from '~/data/sync/workspaceAccount';
import { generateOfflineProfile } from '~/utils';
import {
  notifyWorkspaceChanged,
  waitForWorkspaceTabs,
} from './changeNotification';
import { cleanupRetiredWorkspaces } from './retiredCleanup';
import {
  exportWorkspaceData,
  serializeWorkspaceData,
  type WorkspaceDataExport,
} from './dataTransfer';
import { createWorkspaceDescriptor, type WorkspaceDescriptor } from './types';

export interface AccountIdentity {
  id: string;
  name: string;
  email: string;
}

export interface LocalWorkspaceSummary {
  goalCount: number;
  entryCount: number;
  pendingUploadCount: number;
  hasData: boolean;
  hasUnsyncedChanges: boolean;
}

export interface RemoteWorkspaceSummary {
  result: true;
  ownerAccountId: string;
  goalCount: number;
  entryCount: number;
  hasData: boolean;
}

export async function getLocalWorkspaceSummary(
  database: PowerSyncDatabase = powerSyncDb,
): Promise<LocalWorkspaceSummary> {
  await database.init();
  const [goals, entries, uploadQueue] = await Promise.all([
    database.get<{ count: number }>('SELECT count(*) AS count FROM goal'),
    database.get<{ count: number }>('SELECT count(*) AS count FROM entry'),
    database.getUploadQueueStats(),
  ]);
  const goalCount = Number(goals.count);
  const entryCount = Number(entries.count);

  return {
    goalCount,
    entryCount,
    pendingUploadCount: uploadQueue.count,
    hasData: goalCount > 0 || entryCount > 0,
    hasUnsyncedChanges: uploadQueue.count > 0,
  };
}

export function getRemoteWorkspaceSummary(
  ownerAccountId: string,
): Promise<RemoteWorkspaceSummary> {
  return fetcher<RemoteWorkspaceSummary>('/api/sync/workspace', {
    headers: createWorkspaceOwnerHeaders(ownerAccountId),
  });
}

export async function createWorkspaceExport(
  workspace: WorkspaceDescriptor = activeWorkspace,
  database: PowerSyncDatabase = powerSyncDb,
): Promise<WorkspaceDataExport> {
  await database.init();
  return exportWorkspaceData(database, workspace);
}

export function downloadWorkspaceExport(payload: WorkspaceDataExport): void {
  const blob = new Blob([serializeWorkspaceData(payload)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const timestamp = payload.exportedAt.replaceAll(/[:.]/g, '-');
  anchor.href = url;
  anchor.download = `seon-workspace-${timestamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function writeAccountProfile(
  database: PowerSyncDatabase,
  account: AccountIdentity,
): Promise<void> {
  await database.init();
  await database.writeTransaction(async (tx) => {
    const current = await tx.getOptional<{
      id: string;
      name: string;
      email: string | null;
      preferences: string | null;
      createdAt: string;
    }>('SELECT id, name, email, preferences, createdAt FROM profile LIMIT 1');
    const now = new Date().toISOString();

    if (current?.id === account.id) {
      if (current.name === account.name && current.email === account.email) {
        return;
      }
      await tx.execute(
        `UPDATE profile
          SET name = ?, email = ?, updatedAt = ?
          WHERE id = ?`,
        [account.name, account.email, now, account.id],
      );
      return;
    }

    if (current)
      await tx.execute('DELETE FROM profile WHERE id = ?', [current.id]);
    await tx.execute(
      `INSERT INTO profile
        (id, name, email, preferences, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)`,
      [
        account.id,
        account.name,
        account.email,
        current?.preferences ?? null,
        current?.createdAt ?? now,
        now,
      ],
    );
  });
}

async function finishWorkspaceReplacement(workspaceId: string): Promise<void> {
  notifyWorkspaceChanged(workspaceId);
  await waitForWorkspaceTabs();
  try {
    await cleanupRetiredWorkspaces({
      registry: workspaceRegistry,
      databaseFactory: workspaceDatabaseFactory,
    });
  } catch (error) {
    // The retired descriptor is persisted, so startup can safely retry.
    console.error('Could not start retired workspace cleanup', error);
  }
}

async function discardPreparedWorkspace(
  workspace: WorkspaceDescriptor,
): Promise<void> {
  try {
    await workspaceDatabaseFactory.remove(workspace);
  } catch (error) {
    console.error('Could not discard an unused prepared workspace', error);
  }
}

export async function refreshCurrentAccountProfile(
  account: AccountIdentity,
): Promise<void> {
  await writeAccountProfile(powerSyncDb, account);
}

/** Attach the one current local database; no second live copy is created. */
export async function bindCurrentWorkspaceToAccount(
  account: AccountIdentity,
): Promise<void> {
  if (
    activeWorkspace.kind === 'account' &&
    activeWorkspace.syncBinding.ownerAccountId !== account.id
  ) {
    throw new Error('A different account owns the active workspace');
  }

  await powerSyncDb.disconnect();
  await writeAccountProfile(powerSyncDb, account);
  const bound = await workspaceRegistry.bindActiveWorkspace(
    activeWorkspace.id,
    {
      provider: 'powersync',
      ownerAccountId: account.id,
    },
  );
  notifyWorkspaceChanged(bound.id);
}

/** Prepare the replacement first, atomically select it, then remove the old DB. */
export async function replaceCurrentWorkspaceWithAccount(
  account: AccountIdentity,
): Promise<WorkspaceDescriptor> {
  const previous = activeWorkspace;
  const next = createWorkspaceDescriptor({
    storageBackend: previous.storageBackend,
    syncBinding: {
      provider: 'powersync',
      ownerAccountId: account.id,
    },
  });
  const nextHandle = workspaceDatabaseFactory.open(next);
  try {
    await writeAccountProfile(nextHandle.powerSyncDb, account);
    await workspaceRegistry.replaceActiveWorkspace(next, previous.id);
  } catch (error) {
    await discardPreparedWorkspace(next);
    throw error;
  }
  await finishWorkspaceReplacement(next.id);
  return next;
}

export async function replaceCurrentWorkspaceWithLocal(): Promise<WorkspaceDescriptor> {
  const previous = activeWorkspace;
  const next = createWorkspaceDescriptor({
    storageBackend: previous.storageBackend,
  });
  const nextHandle = workspaceDatabaseFactory.open(next);
  try {
    await nextHandle.powerSyncDb.init();
    const profile = generateOfflineProfile(next.id);
    await nextHandle.db.insertInto('profile').values(profile).execute();
    await workspaceRegistry.replaceActiveWorkspace(next, previous.id);
  } catch (error) {
    await discardPreparedWorkspace(next);
    throw error;
  }
  await finishWorkspaceReplacement(next.id);
  return next;
}
