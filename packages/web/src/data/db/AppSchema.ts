import { ColumnType, Schema, Table, type BaseColumnType } from '@powersync/web';

// Postgres schema: packages/server/src/db/schema.ts
// NOTE: used to map postgres types to sqlite types, including required types
const column = {
  integer: { type: ColumnType.INTEGER } as BaseColumnType<number>,
  text: { type: ColumnType.TEXT } as BaseColumnType<string>,
  real: { type: ColumnType.REAL } as BaseColumnType<number>,
  timestamp: { type: ColumnType.TEXT } as BaseColumnType<string>,
  boolean: { type: ColumnType.INTEGER } as BaseColumnType<number>,
  optionalText: { type: ColumnType.TEXT } as BaseColumnType<string | null>,
  optionalInteger: { type: ColumnType.INTEGER } as BaseColumnType<
    number | null
  >,
  optionalReal: { type: ColumnType.REAL } as BaseColumnType<number | null>,
  optionalTimestamp: { type: ColumnType.TEXT } as BaseColumnType<string | null>,
  optionalBoolean: { type: ColumnType.INTEGER } as BaseColumnType<
    number | null
  >,
};

const profile = new Table(
  {
    // id column (text) is automatically included
    name: column.text,
    email: column.optionalText,
    preferences: column.optionalText,
    createdAt: column.timestamp,
    updatedAt: column.timestamp,
  },
  { indexes: {} },
);

const entry = new Table(
  {
    // id column (text) is automatically included
    shortId: column.text,
    goalId: column.text,
    value: column.integer,
    date: column.text,
    createdAt: column.timestamp,
    updatedAt: column.timestamp,
  },
  {
    indexes: {
      goalId_date: ['goalId', 'date'],
    },
  },
);

// TODO: test how timezone is handled
const goal = new Table(
  {
    // id column (text) is automatically included
    shortId: column.text,
    title: column.text,
    description: column.optionalText,
    target: column.integer,
    unit: column.text,
    startDate: column.timestamp,
    targetDate: column.timestamp,
    createdAt: column.timestamp,
    updatedAt: column.timestamp,
    initialValue: column.integer,
    type: column.text,
    currentValue: column.real,
    completionDate: column.optionalTimestamp,
    archivedAt: column.optionalTimestamp,
  },
  {
    indexes: {
      archivedAt: ['archivedAt'],
    },
  },
);

const workspaceMeta = new Table(
  {
    value: column.text,
    updatedAt: column.timestamp,
  },
  { localOnly: true, indexes: {} },
);

const syncError = new Table(
  {
    transactionId: column.text,
    operationIndex: column.integer,
    entity: column.text,
    entityId: column.text,
    operation: column.text,
    code: column.text,
    message: column.text,
    payload: column.optionalText,
    createdAt: column.timestamp,
    resolvedAt: column.optionalTimestamp,
  },
  {
    localOnly: true,
    indexes: {
      unresolved: ['resolvedAt'],
      transactionId: ['transactionId'],
    },
  },
);

export const AppSchema = new Schema({
  profile,
  entry,
  goal,
  workspace_meta: workspaceMeta,
  sync_error: syncError,
});

export type Database = (typeof AppSchema)['types'];
