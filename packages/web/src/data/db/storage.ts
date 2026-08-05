import * as Sentry from '@sentry/react';

export type StorageBackend = 'opfs' | 'indexeddb';

/**
 * Requests origin-wide persistent storage for local-first application data.
 * A denied or unsupported request does not prevent the app from using
 * best-effort browser storage.
 */
export async function requestPersistentStorage(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined;

  try {
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
  if (!navigator.storage?.getDirectory) return;

  let root: FileSystemDirectoryHandle;
  try {
    root = await navigator.storage.getDirectory();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { storage_error: 'purge_opfs_storage_root' },
    });
    throw error;
  }

  await new Promise((resolve) => setTimeout(resolve, 1));

  const deletionErrors: Error[] = [];
  try {
    for await (const [name, entry] of root.entries()) {
      try {
        await root.removeEntry(name, { recursive: entry.kind === 'directory' });
      } catch (error) {
        deletionErrors.push(
          new Error(`Failed to delete ${entry.kind}: ${name}`, {
            cause: error,
          }),
        );
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
    throw error;
  }

  if (deletionErrors.length > 0) {
    throw new AggregateError(
      deletionErrors,
      `Failed to delete ${deletionErrors.length} OPFS entries`,
    );
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
