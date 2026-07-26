export interface WorkspaceRegistryStorage {
  load(): Promise<unknown | null>;
  save(value: unknown): Promise<void>;
  clear(): Promise<void>;
}

export const WORKSPACE_REGISTRY_DB_NAME = 'seon-workspace-registry';
const REGISTRY_STORE_NAME = 'state';
const REGISTRY_STATE_KEY = 'active';
const LOCAL_STORAGE_KEY = 'seon.workspace-registry.v1';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export class IndexedDbWorkspaceRegistryStorage
  implements WorkspaceRegistryStorage
{
  private async open(): Promise<IDBDatabase> {
    const request = indexedDB.open(WORKSPACE_REGISTRY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(REGISTRY_STORE_NAME)) {
        request.result.createObjectStore(REGISTRY_STORE_NAME);
      }
    };

    return requestResult(request);
  }

  async load(): Promise<unknown | null> {
    const database = await this.open();
    try {
      const transaction = database.transaction(REGISTRY_STORE_NAME, 'readonly');
      const completed = transactionComplete(transaction);
      const value = await requestResult(
        transaction.objectStore(REGISTRY_STORE_NAME).get(REGISTRY_STATE_KEY),
      );
      await completed;
      return value ?? null;
    } finally {
      database.close();
    }
  }

  async save(value: unknown): Promise<void> {
    const database = await this.open();
    try {
      const transaction = database.transaction(
        REGISTRY_STORE_NAME,
        'readwrite',
      );
      transaction
        .objectStore(REGISTRY_STORE_NAME)
        .put(value, REGISTRY_STATE_KEY);
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  }

  async clear(): Promise<void> {
    const database = await this.open();
    try {
      const transaction = database.transaction(
        REGISTRY_STORE_NAME,
        'readwrite',
      );
      transaction.objectStore(REGISTRY_STORE_NAME).delete(REGISTRY_STATE_KEY);
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  }
}

export class LocalStorageWorkspaceRegistryStorage
  implements WorkspaceRegistryStorage
{
  async load(): Promise<unknown | null> {
    const serialized = localStorage.getItem(LOCAL_STORAGE_KEY);
    return serialized === null ? null : JSON.parse(serialized);
  }

  async save(value: unknown): Promise<void> {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
  }

  async clear(): Promise<void> {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

class FallbackWorkspaceRegistryStorage implements WorkspaceRegistryStorage {
  constructor(
    private readonly primary: WorkspaceRegistryStorage,
    private readonly fallback: WorkspaceRegistryStorage,
  ) {}

  async load(): Promise<unknown | null> {
    try {
      const primaryValue = await this.primary.load();
      if (primaryValue !== null) return primaryValue;
    } catch {
      return this.fallback.load();
    }

    const fallbackValue = await this.fallback.load();
    if (fallbackValue !== null) {
      try {
        await this.primary.save(fallbackValue);
        await this.fallback.clear();
      } catch {
        // Keep using the valid fallback if IndexedDB became unavailable.
      }
    }
    return fallbackValue;
  }

  async save(value: unknown): Promise<void> {
    try {
      await this.primary.save(value);
      await this.fallback.clear();
    } catch {
      await this.fallback.save(value);
    }
  }

  async clear(): Promise<void> {
    const results = await Promise.allSettled([
      this.primary.clear(),
      this.fallback.clear(),
    ]);
    if (results.every((result) => result.status === 'rejected')) {
      throw (results[0] as PromiseRejectedResult).reason;
    }
  }
}

export class MemoryWorkspaceRegistryStorage
  implements WorkspaceRegistryStorage
{
  constructor(private value: unknown | null = null) {}

  async load(): Promise<unknown | null> {
    return structuredClone(this.value);
  }

  async save(value: unknown): Promise<void> {
    this.value = structuredClone(value);
  }

  async clear(): Promise<void> {
    this.value = null;
  }
}

export function createBrowserWorkspaceRegistryStorage(): WorkspaceRegistryStorage {
  const localStorageStore = new LocalStorageWorkspaceRegistryStorage();
  if (typeof indexedDB === 'undefined') return localStorageStore;

  return new FallbackWorkspaceRegistryStorage(
    new IndexedDbWorkspaceRegistryStorage(),
    localStorageStore,
  );
}
