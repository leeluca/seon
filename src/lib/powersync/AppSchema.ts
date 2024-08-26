import { column, Schema, TableV2 } from '@powersync/web';

const entry = new TableV2(
  {
    // id column (text) is automatically included
    goalId: column.integer,
    value: column.integer,
    date: column.text,
    createdAt: column.text,
    updatedAt: column.text
  },
  { indexes: {} }
);

const goal = new TableV2(
  {
    // id column (text) is automatically included
    title: column.text,
    description: column.text,
    currentValue: column.integer,
    target: column.integer,
    unit: column.text,
    userId: column.text,
    startDate: column.text,
    targetDate: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    initialValue: column.integer
  },
  { indexes: {} }
);

export const AppSchema = new Schema({
  entry,
  goal
});

export type Database = (typeof AppSchema)['types'];
