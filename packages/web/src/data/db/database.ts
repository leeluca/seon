import { WorkspaceDatabaseFactory } from '~/data/db/factory';
import { isOpfsAvailable, type StorageBackend } from './storage';
import {
  createBrowserWorkspaceRegistryStorage,
  WorkspaceRegistry,
} from '~/data/workspace';

const opfsSupported = await isOpfsAvailable();

const preferredStorageBackend: StorageBackend = opfsSupported
  ? 'opfs'
  : 'indexeddb';

export const workspaceRegistry = new WorkspaceRegistry(
  createBrowserWorkspaceRegistryStorage(),
);
export const activeWorkspace =
  await workspaceRegistry.getOrCreateLocalWorkspace(preferredStorageBackend);
export const workspaceDatabaseFactory = new WorkspaceDatabaseFactory();

const currentWorkspaceDatabase = workspaceDatabaseFactory.open(activeWorkspace);

/** Compatibility exports while consumers move to an injected workspace handle. */
export const DB_NAME = activeWorkspace.databaseFilename;
export const storageBackend = activeWorkspace.storageBackend;
export const powerSyncDb = currentWorkspaceDatabase.powerSyncDb;
const db = currentWorkspaceDatabase.db;

export function getCurrentWorkspaceDatabase() {
  return currentWorkspaceDatabase;
}

export default db;
