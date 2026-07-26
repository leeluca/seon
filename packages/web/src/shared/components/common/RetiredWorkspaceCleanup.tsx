import { useEffect } from 'react';

import {
  workspaceDatabaseFactory,
  workspaceRegistry,
} from '~/data/db/database';
import { cleanupRetiredWorkspaces } from '~/data/workspace/retiredCleanup';

export function RetiredWorkspaceCleanup() {
  useEffect(() => {
    void cleanupRetiredWorkspaces({
      registry: workspaceRegistry,
      databaseFactory: workspaceDatabaseFactory,
    });
  }, []);

  return null;
}
