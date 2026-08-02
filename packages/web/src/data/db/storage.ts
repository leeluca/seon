import * as Sentry from '@sentry/react';

export type StorageBackend = 'opfs' | 'indexeddb';

const SQLITE_FILE_SUFFIXES = ['', '-journal', '-wal', '-shm'] as const;

/** Ask the browser to protect origin storage from automatic eviction. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { storage_error: 'request_persistent_storage' },
    });
    return false;
  }
}

export async function isOpfsAvailable(): Promise<boolean> {
  try {
    if (!navigator.storage?.getDirectory) return false;
    const root = await navigator.storage.getDirectory();
    return !!root;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { storage_error: 'is_opfs_available' },
    });
    return false;
  }
}

export async function isIndexedDbAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false;

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('__seon_idb_probe__');
      req.onupgradeneeded = () => {};
      req.onsuccess = () => {
        req.result.close();
        indexedDB.deleteDatabase('__seon_idb_probe__');
        resolve();
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('indexedDB open blocked'));
    });

    return true;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { storage_error: 'is_indexeddb_available' },
    });
    return false;
  }
}

export async function isLocalDbAvailable(): Promise<boolean> {
  const [opfs, idb] = await Promise.all([
    isOpfsAvailable(),
    isIndexedDbAvailable(),
  ]);
  return opfs || idb;
}

export async function purgeOpfsStorage(): Promise<void> {
  try {
    if (!navigator.storage?.getDirectory) return;

    const root = await navigator.storage.getDirectory();
    await new Promise((resolve) => setTimeout(resolve, 1));

    for await (const [name, entry] of root.entries()) {
      try {
        await root.removeEntry(name, { recursive: entry.kind === 'directory' });
      } catch (error) {
        Sentry.captureException(error, {
          extra: { message: `Failed to delete ${entry.kind}: ${name}` },
          tags: { storage_error: 'purge_opfs_storage' },
        });
      }
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { storage_error: 'purge_opfs_storage_root' },
    });
  }
}

export async function opfsDatabaseExists(dbFilename: string): Promise<boolean> {
  if (!navigator.storage?.getDirectory) return false;

  try {
    const root = await navigator.storage.getDirectory();
    await root.getFileHandle(dbFilename);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return false;
    }
    throw error;
  }
}

/** Delete one SQLite database without touching other workspaces on the origin. */
export async function purgeOpfsDatabase(dbFilename: string): Promise<void> {
  if (!navigator.storage?.getDirectory) return;

  const root = await navigator.storage.getDirectory();
  await new Promise((resolve) => setTimeout(resolve, 1));

  for (const suffix of SQLITE_FILE_SUFFIXES) {
    try {
      await root.removeEntry(`${dbFilename}${suffix}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        continue;
      }
      throw error;
    }
  }
}

export async function indexedDbDatabaseExists(
  dbName: string,
): Promise<boolean | undefined> {
  if (typeof indexedDB === 'undefined') return false;
  if (!indexedDB.databases) return undefined;

  const databases = await indexedDB.databases();
  return databases.some((database) => database.name === dbName);
}

export async function workspaceDatabaseStorageExists(
  storageBackend: StorageBackend,
  dbFilename: string,
): Promise<boolean | undefined> {
  return storageBackend === 'opfs'
    ? opfsDatabaseExists(dbFilename)
    : indexedDbDatabaseExists(dbFilename);
}

export async function purgeWorkspaceDatabaseStorage(
  storageBackend: StorageBackend,
  dbFilename: string,
): Promise<void> {
  if (storageBackend === 'opfs') {
    await purgeOpfsDatabase(dbFilename);
  } else {
    await removeIndexedDbStorage(dbFilename);
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function clearIndexedDbDatabase(idbName: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(idbName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('indexedDB open blocked'));
  });

  try {
    const storeNames = Array.from(db.objectStoreNames);
    if (storeNames.length === 0) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('indexedDB tx aborted'));

      for (const storeName of storeNames) {
        tx.objectStore(storeName).clear();
      }
    });
  } finally {
    db.close();
  }
}

async function deleteIndexedDbDatabase(idbName: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(idbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('indexedDB deleteDatabase blocked'));
  });
}

/** Remove a named workspace database, falling back to a content clear on Safari. */
export async function removeIndexedDbStorage(idbName: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await deleteIndexedDbDatabase(idbName);
      return;
    } catch (error) {
      lastError = error;
      await wait(50 * (attempt + 1));
    }
  }

  try {
    await clearIndexedDbDatabase(idbName);
  } catch {
    throw lastError;
  }
}

/**
 * Resets the IDB-backed VFS storage.
 *
 * In Safari private mode, `deleteDatabase` can fail with transient UnknownError.
 * Clearing all object stores is often more reliable and is sufficient for “reset”.
 */
export async function purgeIndexedDbStorage(idbName: string): Promise<void> {
  try {
    await clearIndexedDbDatabase(idbName);
    return;
  } catch (error) {
    console.log(
      'clearIndexedDbDatabase failed, falling back to deleteDatabase',
      error,
    );
    Sentry.captureException(error, {
      tags: { storage_error: 'purge_indexeddb_clear_failed' },
      extra: { idbName },
    });
  }

  // Fall back to deleteDatabase with retries.
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await deleteIndexedDbDatabase(idbName);
      return;
    } catch (error) {
      lastError = error;
      await wait(50 * (attempt + 1));
    }
  }

  throw lastError;
}
