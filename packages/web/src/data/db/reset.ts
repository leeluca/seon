import * as Sentry from '@sentry/react';

import { activeWorkspace, workspaceDatabaseFactory } from '~/data/db/database';
import type { WorkspaceDatabaseFactory } from '~/data/db/factory';
import type { WorkspaceDescriptor } from '~/data/workspace';

export async function resetWorkspaceDatabase(
  workspace: WorkspaceDescriptor,
  databaseFactory: WorkspaceDatabaseFactory,
): Promise<void> {
  await databaseFactory.remove(workspace);
}

export async function resetLocalDatabase(): Promise<void> {
  try {
    await resetWorkspaceDatabase(activeWorkspace, workspaceDatabaseFactory);
  } catch (error) {
    console.error('Failed to purge local database storage', error);
    Sentry.captureException(error, {
      tags: { storage_error: 'reset_db_purge_failed' },
      extra: {
        workspaceId: activeWorkspace.id,
        storageBackend: activeWorkspace.storageBackend,
        dbFilename: activeWorkspace.databaseFilename,
      },
    });
  }
}
