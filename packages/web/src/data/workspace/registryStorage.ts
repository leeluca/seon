export interface WorkspaceRegistryStorage {
  load(): Promise<unknown | null>;
  save(value: unknown): Promise<void>;
  clear(): Promise<void>;
}

export const WORKSPACE_REGISTRY_DB_NAME = 'seon-workspace-registry';
const REGISTRY_STORE_NAME = 'state';
const REGISTRY_STATE_KEY = 'active';

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

export class IndexedDbWorkspaceMetadataStorage
  implements WorkspaceRegistryStorage
{
  constructor(private readonly key: string) {}

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
        transaction.objectStore(REGISTRY_STORE_NAME).get(this.key),
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
      transaction.objectStore(REGISTRY_STORE_NAME).put(value, this.key);
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
      transaction.objectStore(REGISTRY_STORE_NAME).delete(this.key);
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  }
}

export class IndexedDbWorkspaceRegistryStorage extends IndexedDbWorkspaceMetadataStorage {
  constructor() {
    super(REGISTRY_STATE_KEY);
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
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is required to persist the workspace registry');
  }
  return new IndexedDbWorkspaceRegistryStorage();
}
