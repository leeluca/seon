import type { WorkspaceDatabaseFactory } from '~/data/db/factory';
import type { WorkspaceRegistry } from './registry';
import type { WorkspaceDescriptor } from './types';

export interface RemoveWorkspaceOptions {
  workspace: WorkspaceDescriptor;
  registry: WorkspaceRegistry;
  databaseFactory: WorkspaceDatabaseFactory;
}

/**
 * Permanently removes the explicitly selected workspace database, then clears
 * its descriptor. Callers must handle export/confirmation before invoking it.
 */
export async function removeWorkspace({
  workspace,
  registry,
  databaseFactory,
}: RemoveWorkspaceOptions): Promise<void> {
  await databaseFactory.remove(workspace);
  await registry.removeActiveWorkspace(workspace.id);
}
