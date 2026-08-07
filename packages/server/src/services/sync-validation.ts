import type { SyncOperation, SyncRejection } from '../types/sync.js';

type NormalizedGoalData = Partial<{
  shortId: string | null;
  title: string;
  description: string | null;
  initialValue: number;
  currentValue: number;
  target: number;
  unit: string;
  startDate: string;
  targetDate: string;
  createdAt: string;
  completionDate: string | null;
  archivedAt: string | null;
  type: 'COUNT' | 'PROGRESS' | 'BOOLEAN';
}>;

type NormalizedEntryData = Partial<{
  shortId: string | null;
  goalId: string;
  value: number;
  date: string;
  createdAt: string;
}>;

type NormalizedProfileData = {
  preferences?: Record<string, unknown> | null;
};

const POSTGRES_INTEGER_MIN = -2_147_483_648;
const POSTGRES_INTEGER_MAX = 2_147_483_647;

export type NormalizedSyncOperation =
  | (Omit<SyncOperation, 'table' | 'data'> & {
      table: 'goal';
      data: NormalizedGoalData;
    })
  | (Omit<SyncOperation, 'table' | 'data'> & {
      table: 'entry';
      data: NormalizedEntryData;
    })
  | (Omit<SyncOperation, 'table' | 'data'> & {
      table: 'profile';
      data: NormalizedProfileData;
    });

export type SyncOperationValidation =
  | { operation: NormalizedSyncOperation; rejection?: never }
  | { operation?: never; rejection: Omit<SyncRejection, 'operationIndex'> };

const GOAL_FIELDS = new Set([
  'shortId',
  'title',
  'description',
  'initialValue',
  'currentValue',
  'target',
  'unit',
  'startDate',
  'targetDate',
  'createdAt',
  'updatedAt',
  'completionDate',
  'archivedAt',
  'type',
]);
const ENTRY_FIELDS = new Set([
  'shortId',
  'goalId',
  'value',
  'date',
  'createdAt',
  'updatedAt',
]);
const PROFILE_FIELDS = new Set([
  'name',
  'email',
  'preferences',
  'createdAt',
  'updatedAt',
]);

const GOAL_REQUIRED_FIELDS = [
  'shortId',
  'title',
  'initialValue',
  'currentValue',
  'target',
  'unit',
  'startDate',
  'targetDate',
  'createdAt',
  'type',
] as const;
const ENTRY_REQUIRED_FIELDS = [
  'shortId',
  'goalId',
  'value',
  'date',
  'createdAt',
] as const;

function reject(code: string, message: string): SyncOperationValidation {
  return { rejection: { code, message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isPostgresInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= POSTGRES_INTEGER_MIN &&
    value <= POSTGRES_INTEGER_MAX
  );
}

function invalidFields(
  data: Record<string, unknown>,
  allowed: Set<string>,
): string[] {
  return Object.keys(data).filter((field) => !allowed.has(field));
}

function validateRequiredFields(
  data: Record<string, unknown>,
  fields: readonly string[],
): string[] {
  return fields.filter((field) => data[field] === undefined);
}

function normalizeGoal(operation: SyncOperation): SyncOperationValidation {
  const data = operation.data ?? {};
  const unknown = invalidFields(data, GOAL_FIELDS);
  if (unknown.length > 0) {
    return reject(
      'unsupported_field',
      `Unsupported goal field(s): ${unknown.join(', ')}`,
    );
  }
  if (operation.op === 'PUT') {
    const missing = validateRequiredFields(data, GOAL_REQUIRED_FIELDS);
    if (missing.length > 0) {
      return reject(
        'missing_field',
        `Missing goal field(s): ${missing.join(', ')}`,
      );
    }
  }

  const output: NormalizedGoalData = {};
  for (const field of ['shortId', 'description'] as const) {
    const value = data[field];
    if (value !== undefined) {
      if (value !== null && typeof value !== 'string') {
        return reject('invalid_field', `${field} must be text or null`);
      }
      output[field] = value;
    }
  }
  for (const field of ['title', 'unit'] as const) {
    const value = data[field];
    if (value !== undefined) {
      if (typeof value !== 'string' || (field === 'title' && !value.trim())) {
        return reject('invalid_field', `${field} must be text`);
      }
      output[field] = value;
    }
  }
  for (const field of ['initialValue', 'currentValue', 'target'] as const) {
    const value = data[field];
    if (value !== undefined) {
      if (!isPostgresInteger(value)) {
        return reject('invalid_field', `${field} must be a PostgreSQL integer`);
      }
      output[field] = value;
    }
  }
  for (const field of ['startDate', 'targetDate', 'createdAt'] as const) {
    const value = data[field];
    if (value !== undefined) {
      if (!isIsoDate(value)) {
        return reject('invalid_field', `${field} must be an ISO date`);
      }
      output[field] = new Date(value).toISOString();
    }
  }
  for (const field of ['completionDate', 'archivedAt'] as const) {
    const value = data[field];
    if (value !== undefined) {
      if (value !== null && !isIsoDate(value)) {
        return reject('invalid_field', `${field} must be an ISO date or null`);
      }
      output[field] = value === null ? null : new Date(value).toISOString();
    }
  }
  if (data.type !== undefined) {
    if (!['COUNT', 'PROGRESS', 'BOOLEAN'].includes(String(data.type))) {
      return reject('invalid_field', 'type is not a supported goal type');
    }
    output.type = data.type as NormalizedGoalData['type'];
  }

  return {
    operation: { ...operation, table: 'goal', data: output },
  };
}

function normalizeEntry(operation: SyncOperation): SyncOperationValidation {
  const data = operation.data ?? {};
  const unknown = invalidFields(data, ENTRY_FIELDS);
  if (unknown.length > 0) {
    return reject(
      'unsupported_field',
      `Unsupported entry field(s): ${unknown.join(', ')}`,
    );
  }
  if (operation.op === 'PUT') {
    const missing = validateRequiredFields(data, ENTRY_REQUIRED_FIELDS);
    if (missing.length > 0) {
      return reject(
        'missing_field',
        `Missing entry field(s): ${missing.join(', ')}`,
      );
    }
  }

  const output: NormalizedEntryData = {};
  if (data.shortId !== undefined) {
    if (data.shortId !== null && typeof data.shortId !== 'string') {
      return reject('invalid_field', 'shortId must be text or null');
    }
    output.shortId = data.shortId;
  }
  if (data.goalId !== undefined) {
    if (!isUuid(data.goalId)) {
      return reject('invalid_field', 'goalId must be a UUID');
    }
    output.goalId = data.goalId;
  }
  if (data.value !== undefined) {
    if (!isPostgresInteger(data.value)) {
      return reject('invalid_field', 'value must be a PostgreSQL integer');
    }
    output.value = data.value;
  }
  for (const field of ['date', 'createdAt'] as const) {
    const value = data[field];
    if (value !== undefined) {
      if (!isIsoDate(value)) {
        return reject('invalid_field', `${field} must be an ISO date`);
      }
      output[field] = new Date(value).toISOString();
    }
  }

  return {
    operation: { ...operation, table: 'entry', data: output },
  };
}

function normalizePreferences(
  value: unknown,
): Record<string, unknown> | null | undefined {
  if (value === undefined || value === null) return value;

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (!isRecord(parsed)) return undefined;

  const supportedKeys = new Set([
    'language',
    'defaultGoalSort',
    'defaultGoalFilter',
  ]);
  if (Object.keys(parsed).some((key) => !supportedKeys.has(key))) {
    return undefined;
  }
  if (
    parsed.language !== undefined &&
    !['en', 'ko', 'pt'].includes(String(parsed.language))
  ) {
    return undefined;
  }
  if (
    parsed.defaultGoalSort !== undefined &&
    ![
      'createdAt desc',
      'createdAt asc',
      'targetDate desc',
      'targetDate asc',
      'title asc',
      'title desc',
    ].includes(String(parsed.defaultGoalSort))
  ) {
    return undefined;
  }
  if (
    parsed.defaultGoalFilter !== undefined &&
    !['all', 'ongoing', 'completed', 'archived'].includes(
      String(parsed.defaultGoalFilter),
    )
  ) {
    return undefined;
  }
  return parsed;
}

function normalizeProfile(operation: SyncOperation): SyncOperationValidation {
  if (operation.op === 'DELETE') {
    // Rebinding a local workspace replaces its local-only profile id, which
    // produces a DELETE for the old id. Profile deletion is a server no-op;
    // the Better Auth account and its identity fields remain intact.
    return {
      operation: { ...operation, table: 'profile', data: {} },
    };
  }

  const data = operation.data ?? {};
  const unknown = invalidFields(data, PROFILE_FIELDS);
  if (unknown.length > 0) {
    return reject(
      'unsupported_field',
      `Unsupported profile field(s): ${unknown.join(', ')}`,
    );
  }

  const output: NormalizedProfileData = {};
  // A local account binding creates a full profile PUT before the account's
  // existing row has downloaded. Only explicit edits to an established local
  // profile may update account preferences.
  if (operation.op === 'PATCH' && 'preferences' in data) {
    const preferences = normalizePreferences(data.preferences);
    if (preferences === undefined && data.preferences !== undefined) {
      return reject('invalid_field', 'preferences are invalid');
    }
    output.preferences = preferences ?? null;
  }

  // name/email/timestamps are accepted on the wire because a local PUT
  // includes the entire row, but remain server-owned and are not applied.
  return {
    operation: { ...operation, table: 'profile', data: output },
  };
}

export function validateSyncOperation(
  operation: SyncOperation,
): SyncOperationValidation {
  if (operation.data && !isRecord(operation.data)) {
    return reject('invalid_data', 'Operation data must be an object');
  }
  if (operation.op !== 'DELETE' && !operation.data) {
    return reject('missing_data', `${operation.op} requires operation data`);
  }

  switch (operation.table) {
    case 'goal':
      return normalizeGoal(operation);
    case 'entry':
      return normalizeEntry(operation);
    case 'profile':
      return normalizeProfile(operation);
  }
}
