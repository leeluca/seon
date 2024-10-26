import { BaseColumnType, ColumnType, Schema, Table } from '@powersync/web';

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

const user = new Table(
  {
    // id column (text) is automatically included
    shortId: column.text,
    name: column.text,
    email: column.optionalText,
    createdAt: column.timestamp,
    updatedAt: column.timestamp,
    useSync: column.boolean,
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
    userId: column.text,
  },
  { indexes: {} },
);

const goal = new Table(
  {
    // id column (text) is automatically included
    shortId: column.text,
    title: column.text,
    description: column.optionalText,
    currentValue: column.integer,
    target: column.integer,
    unit: column.text,
    userId: column.text,
    startDate: column.timestamp,
    targetDate: column.timestamp,
    createdAt: column.timestamp,
    updatedAt: column.timestamp,
    initialValue: column.integer,
  },
  { indexes: {} },
);

export const AppSchema = new Schema({
  user,
  entry,
  goal,
});

export type Database = (typeof AppSchema)['types'];
