import {
  PowerSyncDatabase,
  WASQLiteOpenFactory,
  WASQLiteVFS,
} from '@powersync/web';

import { AppSchema } from '~/data/db/AppSchema';
import {
  purgeIndexedDbStorage,
  purgeWorkspaceDatabaseStorage,
  type StorageBackend,
  workspaceDatabaseStorageExists,
} from '~/data/db/storage';
import {
  exportWorkspaceData,
  importWorkspaceData,
  LEGACY_IMPORT_ID,
  type ImportWorkspaceDataResult,
  type ExportWorkspaceDataOptions,
  type WorkspaceDataExport,
  type WorkspaceDataWriter,
} from './dataTransfer';

export const LEGACY_DATABASE_FILENAME = 'seon-goals.db';

export interface LegacyWorkspaceCandidate {
  databaseFilename: typeof LEGACY_DATABASE_FILENAME;
  storageBackend: StorageBackend;
  goalCount: number;
  entryCount: number;
}

function openLegacyDatabase(storageBackend: StorageBackend): PowerSyncDatabase {
  const multiTabEnabled = typeof SharedWorker !== 'undefined';
  return new PowerSyncDatabase({
    schema: AppSchema,
    database: new WASQLiteOpenFactory({
      dbFilename: LEGACY_DATABASE_FILENAME,
      vfs:
        storageBackend === 'opfs'
          ? WASQLiteVFS.OPFSCoopSyncVFS
          : WASQLiteVFS.IDBBatchAtomicVFS,
      flags: { enableMultiTabs: multiTabEnabled },
    }),
    flags: { enableMultiTabs: multiTabEnabled },
  });
}

export async function detectLegacyWorkspaceData(): Promise<
  LegacyWorkspaceCandidate[]
> {
  const candidates: LegacyWorkspaceCandidate[] = [];

  for (const storageBackend of ['opfs', 'indexeddb'] as const) {
    const exists = await workspaceDatabaseStorageExists(
      storageBackend,
      LEGACY_DATABASE_FILENAME,
    );
    if (exists === false) continue;

    const database = openLegacyDatabase(storageBackend);
    let removeEmptyProbe = false;
    try {
      const [goal, entry] = await Promise.all([
        database.get<{ count: number }>('SELECT count(*) AS count FROM goal'),
        database.get<{ count: number }>('SELECT count(*) AS count FROM entry'),
      ]);
      if (goal.count > 0 || entry.count > 0) {
        candidates.push({
          databaseFilename: LEGACY_DATABASE_FILENAME,
          storageBackend,
          goalCount: Number(goal.count),
          entryCount: Number(entry.count),
        });
      } else if (exists === undefined && storageBackend === 'indexeddb') {
        removeEmptyProbe = true;
      }
    } finally {
      await database.close();
    }
    if (removeEmptyProbe) {
      await purgeIndexedDbStorage(LEGACY_DATABASE_FILENAME);
    }
  }

  return candidates;
}

export async function importLegacyWorkspaceData(
  candidate: LegacyWorkspaceCandidate,
  targetDatabase: WorkspaceDataWriter,
): Promise<ImportWorkspaceDataResult> {
  const payload = await exportLegacyWorkspaceData(candidate);
  return importWorkspaceData(targetDatabase, payload, {
    importId: getLegacyImportId(candidate),
  });
}

export function getLegacyImportId(candidate: LegacyWorkspaceCandidate): string {
  assertLegacyCandidate(candidate);
  return `${LEGACY_IMPORT_ID}:${candidate.storageBackend}:${candidate.databaseFilename}`;
}

export async function exportLegacyWorkspaceData(
  candidate: LegacyWorkspaceCandidate,
  options: ExportWorkspaceDataOptions = {},
): Promise<WorkspaceDataExport> {
  assertLegacyCandidate(candidate);
  const source = openLegacyDatabase(candidate.storageBackend);
  try {
    return await exportWorkspaceData(
      source,
      { id: `legacy:${candidate.storageBackend}`, kind: 'local' },
      options,
    );
  } finally {
    await source.close();
  }
}

export async function discardLegacyWorkspaceData(
  candidate: LegacyWorkspaceCandidate,
): Promise<void> {
  assertLegacyCandidate(candidate);
  await purgeWorkspaceDatabaseStorage(
    candidate.storageBackend,
    LEGACY_DATABASE_FILENAME,
  );
}

function assertLegacyCandidate(candidate: LegacyWorkspaceCandidate): void {
  if (
    candidate.databaseFilename !== LEGACY_DATABASE_FILENAME ||
    (candidate.storageBackend !== 'opfs' &&
      candidate.storageBackend !== 'indexeddb')
  ) {
    throw new Error('Invalid legacy workspace candidate');
  }
}
