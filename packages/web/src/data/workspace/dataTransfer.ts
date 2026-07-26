import type { WorkspaceDescriptor } from './types';

export const WORKSPACE_EXPORT_FORMAT = 'seon-workspace-export' as const;
export const WORKSPACE_EXPORT_VERSION = 1 as const;
export const LEGACY_IMPORT_ID = 'legacy-seon-goals-v1';

export interface WorkspaceProfileRecord {
  id: string;
  name: string;
  email: string | null;
  preferences: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceGoalRecord {
  id: string;
  shortId: string;
  title: string;
  description: string | null;
  target: number;
  unit: string;
  startDate: string;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  initialValue: number;
  type: string;
  currentValue: number;
  completionDate: string | null;
  archivedAt: string | null;
}

export interface WorkspaceEntryRecord {
  id: string;
  shortId: string;
  goalId: string;
  value: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDataExport {
  format: typeof WORKSPACE_EXPORT_FORMAT;
  version: typeof WORKSPACE_EXPORT_VERSION;
  exportId: string;
  exportedAt: string;
  source: {
    workspaceId: string;
    kind: WorkspaceDescriptor['kind'];
  };
  data: {
    profile: WorkspaceProfileRecord | null;
    goals: WorkspaceGoalRecord[];
    entries: WorkspaceEntryRecord[];
  };
}

export interface WorkspaceDataReader {
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
}

export interface WorkspaceDataTransaction extends WorkspaceDataReader {
  execute(sql: string, parameters?: unknown[]): Promise<unknown>;
}

export interface WorkspaceDataWriter extends WorkspaceDataReader {
  writeTransaction<T>(
    callback: (transaction: WorkspaceDataTransaction) => Promise<T>,
  ): Promise<T>;
}

export interface ExportWorkspaceDataOptions {
  idFactory?: () => string;
  now?: () => Date;
}

export type WorkspaceExportSource = Pick<WorkspaceDescriptor, 'id' | 'kind'>;

export async function exportWorkspaceData(
  database: WorkspaceDataReader,
  workspace: WorkspaceExportSource,
  options: ExportWorkspaceDataOptions = {},
): Promise<WorkspaceDataExport> {
  const [profiles, goals, entries] = await Promise.all([
    database.getAll<WorkspaceProfileRecord>(
      'SELECT id, name, email, preferences, createdAt, updatedAt FROM profile LIMIT 1',
    ),
    database.getAll<WorkspaceGoalRecord>(
      `SELECT id, shortId, title, description, target, unit, startDate,
        targetDate, createdAt, updatedAt, initialValue, type, currentValue,
        completionDate, archivedAt FROM goal ORDER BY createdAt, id`,
    ),
    database.getAll<WorkspaceEntryRecord>(
      `SELECT id, shortId, goalId, value, date, createdAt, updatedAt
        FROM entry ORDER BY date, createdAt, id`,
    ),
  ]);

  return {
    format: WORKSPACE_EXPORT_FORMAT,
    version: WORKSPACE_EXPORT_VERSION,
    exportId: (options.idFactory ?? (() => crypto.randomUUID()))(),
    exportedAt: (options.now ?? (() => new Date()))().toISOString(),
    source: { workspaceId: workspace.id, kind: workspace.kind },
    data: { profile: profiles[0] ?? null, goals, entries },
  };
}

export function serializeWorkspaceData(payload: WorkspaceDataExport): string {
  assertWorkspaceDataExport(payload);
  return JSON.stringify(payload, null, 2);
}

export function parseWorkspaceData(serialized: string): WorkspaceDataExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('The selected file is not valid JSON');
  }
  assertWorkspaceDataExport(parsed);
  return parsed;
}

export interface ImportWorkspaceDataOptions {
  /** Reusing an import id makes retries safe. Defaults to the export's stable id. */
  importId?: string;
  now?: () => Date;
}

export interface ImportWorkspaceDataResult {
  importId: string;
  alreadyImported: boolean;
  imported: { profile: number; goals: number; entries: number };
  skipped: { profile: number; goals: number; entries: number };
}

export async function importWorkspaceData(
  database: WorkspaceDataWriter,
  payload: WorkspaceDataExport,
  options: ImportWorkspaceDataOptions = {},
): Promise<ImportWorkspaceDataResult> {
  assertWorkspaceDataExport(payload);
  const importId = options.importId ?? `json:${payload.exportId}`;
  const markerId = `data-import:${importId}`;
  const now = options.now ?? (() => new Date());

  return database.writeTransaction(async (transaction) => {
    const completed = await transaction.getOptional<{ id: string }>(
      'SELECT id FROM workspace_meta WHERE id = ?',
      [markerId],
    );
    if (completed) {
      return {
        importId,
        alreadyImported: true,
        imported: { profile: 0, goals: 0, entries: 0 },
        skipped: {
          profile: payload.data.profile ? 1 : 0,
          goals: payload.data.goals.length,
          entries: payload.data.entries.length,
        },
      };
    }

    const result: ImportWorkspaceDataResult = {
      importId,
      alreadyImported: false,
      imported: { profile: 0, goals: 0, entries: 0 },
      skipped: { profile: 0, goals: 0, entries: 0 },
    };

    if (payload.data.profile) {
      const existingProfile = await transaction.getOptional<{ id: string }>(
        'SELECT id FROM profile LIMIT 1',
      );
      if (existingProfile) {
        result.skipped.profile += 1;
      } else {
        const profile = payload.data.profile;
        await transaction.execute(
          `INSERT INTO profile
            (id, name, email, preferences, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)`,
          [
            profile.id,
            profile.name,
            profile.email,
            profile.preferences,
            profile.createdAt,
            profile.updatedAt,
          ],
        );
        result.imported.profile += 1;
      }
    }

    for (const goal of payload.data.goals) {
      if (await recordExists(transaction, 'goal', goal.id)) {
        result.skipped.goals += 1;
        continue;
      }
      await transaction.execute(
        `INSERT INTO goal
          (id, shortId, title, description, target, unit, startDate,
           targetDate, createdAt, updatedAt, initialValue, type, currentValue,
           completionDate, archivedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          goal.id,
          goal.shortId,
          goal.title,
          goal.description,
          goal.target,
          goal.unit,
          goal.startDate,
          goal.targetDate,
          goal.createdAt,
          goal.updatedAt,
          goal.initialValue,
          goal.type,
          goal.currentValue,
          goal.completionDate,
          goal.archivedAt,
        ],
      );
      result.imported.goals += 1;
    }

    for (const entry of payload.data.entries) {
      if (await recordExists(transaction, 'entry', entry.id)) {
        result.skipped.entries += 1;
        continue;
      }
      await transaction.execute(
        `INSERT INTO entry
          (id, shortId, goalId, value, date, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.shortId,
          entry.goalId,
          entry.value,
          entry.date,
          entry.createdAt,
          entry.updatedAt,
        ],
      );
      result.imported.entries += 1;
    }

    const completedAt = now().toISOString();
    await transaction.execute(
      `INSERT INTO workspace_meta (id, value, updatedAt)
        VALUES (?, ?, ?)`,
      [
        markerId,
        JSON.stringify({
          importId,
          exportId: payload.exportId,
          completedAt,
          imported: result.imported,
          skipped: result.skipped,
        }),
        completedAt,
      ],
    );

    return result;
  });
}

async function recordExists(
  transaction: WorkspaceDataTransaction,
  table: 'profile' | 'goal' | 'entry',
  id: string,
): Promise<boolean> {
  return Boolean(
    await transaction.getOptional<{ id: string }>(
      `SELECT id FROM ${table} WHERE id = ?`,
      [id],
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isProfile(value: unknown): value is WorkspaceProfileRecord {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name) &&
    isNullableString(value.email) &&
    isNullableString(value.preferences) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isGoal(value: unknown): value is WorkspaceGoalRecord {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.shortId) &&
    isString(value.title) &&
    isNullableString(value.description) &&
    isFiniteNumber(value.target) &&
    isString(value.unit) &&
    isString(value.startDate) &&
    isString(value.targetDate) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isFiniteNumber(value.initialValue) &&
    isString(value.type) &&
    isFiniteNumber(value.currentValue) &&
    isNullableString(value.completionDate) &&
    isNullableString(value.archivedAt)
  );
}

function isEntry(value: unknown): value is WorkspaceEntryRecord {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.shortId) &&
    isString(value.goalId) &&
    isFiniteNumber(value.value) &&
    isString(value.date) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

export function assertWorkspaceDataExport(
  value: unknown,
): asserts value is WorkspaceDataExport {
  if (!isRecord(value) || !isRecord(value.source) || !isRecord(value.data)) {
    throw new Error('Invalid Seon workspace export');
  }

  const profile = value.data.profile;
  const goals = value.data.goals;
  const entries = value.data.entries;
  if (
    value.format !== WORKSPACE_EXPORT_FORMAT ||
    value.version !== WORKSPACE_EXPORT_VERSION ||
    !isString(value.exportId) ||
    !isString(value.exportedAt) ||
    !isString(value.source.workspaceId) ||
    (value.source.kind !== 'local' && value.source.kind !== 'account') ||
    (profile !== null && !isProfile(profile)) ||
    !Array.isArray(goals) ||
    !goals.every(isGoal) ||
    !Array.isArray(entries) ||
    !entries.every(isEntry)
  ) {
    throw new Error('Invalid Seon workspace export');
  }

  const goalIds = new Set(goals.map((goal) => goal.id));
  if (entries.some((entry) => !goalIds.has(entry.goalId))) {
    throw new Error('Workspace export contains an entry without its goal');
  }
}
