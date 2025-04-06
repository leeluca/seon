import { powerSyncDb } from '~/lib/database';

/**
 * Checks if Origin Private File System (OPFS) is available in the current browser
 */
export async function isOpfsAvailable(): Promise<boolean> {
  try {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      return false;
    }

    const root = await navigator.storage.getDirectory();
    return !!root;
  } catch (error) {
    console.error('OPFS availability check failed:', error);
    return false;
  }
}

// Clear all OPFS storage
export async function purgeStorage() {
  await powerSyncDb.disconnect();
  await powerSyncDb.close();

  const root = await navigator.storage.getDirectory();
  await new Promise((resolve) => setTimeout(resolve, 1)); // Allow .db-wal to become deletable

  for await (const [name, entry] of root.entries()) {
    try {
      if (entry.kind === 'file') {
        await root.removeEntry(name);
      } else if (entry.kind === 'directory') {
        await root.removeEntry(name, { recursive: true });
      }
    } catch (err) {
      console.error(`Failed to delete ${entry.kind}: ${name}`, err);
    }
  }
}

// List OPFS entries
export async function listVfsEntries() {
  const root = await navigator.storage.getDirectory();
  for await (const [name, entry] of root.entries()) {
    console.log(`${entry.kind}: ${name}`);
  }
}
