import { BaseColumnType, ColumnType, Schema, TableV2 } from '@powersync/web';

// Postgres schema: prisma/schema.prisma
// NOTE: map postgres types to sqlite types, including required types
const column = {
  integer: { type: ColumnType.INTEGER } as BaseColumnType<number>,
  text: { type: ColumnType.TEXT } as BaseColumnType<string>,
  real: { type: ColumnType.REAL } as BaseColumnType<number>,
  timestamp: { type: ColumnType.TEXT } as BaseColumnType<string>,
  optionalText: { type: ColumnType.TEXT } as BaseColumnType<string | null>,
  optionalInteger: { type: ColumnType.INTEGER } as BaseColumnType<
    number | null
  >,
  optionalReal: { type: ColumnType.REAL } as BaseColumnType<number | null>,
  optionalTimestamp: { type: ColumnType.TEXT } as BaseColumnType<string | null>,
};

const entry = new TableV2(
  {
    // id column (text) is automatically included
    goalId: column.integer,
    value: column.integer,
    date: column.text,
    createdAt: column.timestamp,
    updatedAt: column.timestamp,
  },
  { indexes: {} },
);

const goal = new TableV2(
  {
    // id column (text) is automatically included
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
  entry,
  goal,
});

export type Database = (typeof AppSchema)['types'];
