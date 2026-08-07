import type { WorkspaceRegistry } from './registry';
import type { WorkspaceDescriptor } from './types';

export interface RetiredWorkspaceDatabaseFactory {
  remove(workspace: WorkspaceDescriptor): Promise<void>;
}

export interface CleanupRetiredWorkspacesOptions {
  registry: WorkspaceRegistry;
  databaseFactory: RetiredWorkspaceDatabaseFactory;
}

/**
 * Remove databases that were atomically retired during workspace replacement.
 * Failed removals stay in the registry so a later startup can retry them.
 */
export async function cleanupRetiredWorkspaces({
  registry,
  databaseFactory,
}: CleanupRetiredWorkspacesOptions): Promise<number> {
  const retiredWorkspaces = await registry.getRetiredWorkspaces();
  let removed = 0;

  for (const workspace of retiredWorkspaces) {
    try {
      const activeWorkspace = await registry.getActiveWorkspace();
      if (activeWorkspace?.id === workspace.id) continue;

      await databaseFactory.remove(workspace);
      await registry.forgetRetiredWorkspace(workspace.id);
      removed += 1;
    } catch (error) {
      console.error('Could not clean up a retired workspace', error);
    }
  }

  return removed;
}
