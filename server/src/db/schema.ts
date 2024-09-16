import { sql } from 'drizzle-orm';
import {
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('UserStatus', [
  'ACTIVE',
  'PENDING',
  'DISABLED',
]);

export const user = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().notNull(),
    shortId: text('shortId'),
    name: text('name').notNull(),
    password: text('password').notNull(),
    email: text('email'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
    status: userStatus('status').default('PENDING').notNull(),
  },
  (table) => {
    return {
      emailKey: uniqueIndex('user_email_key').using(
        'btree',
        table.email.asc().nullsLast(),
      ),
      nameKey: uniqueIndex('user_name_key').using(
        'btree',
        table.name.asc().nullsLast(),
      ),
      shortIdKey: uniqueIndex('user_shortId_key').using(
        'btree',
        table.shortId.asc().nullsLast(),
      ),
    };
  },
);

export const goal = pgTable(
  'goal',
  {
    id: uuid('id').primaryKey().notNull(),
    shortId: text('shortId'),
    title: text('title').notNull(),
    description: text('description'),
    initialValue: integer('initialValue').default(0).notNull(),
    currentValue: integer('currentValue').default(0).notNull(),
    target: integer('target').notNull(),
    unit: text('unit').default('').notNull(),
    userId: uuid('userId').notNull(),
    startDate: timestamp('startDate', {
      precision: 3,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    targetDate: timestamp('targetDate', {
      precision: 3,
      mode: 'string',
    })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => {
    return {
      shortIdKey: uniqueIndex('goal_shortId_key').using(
        'btree',
        table.shortId.asc().nullsLast(),
      ),
      goalUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: 'goal_userId_fkey',
      })
        .onUpdate('cascade')
        .onDelete('restrict'),
    };
  },
);

export const entry = pgTable(
  'entry',
  {
    id: uuid('id').primaryKey().notNull(),
    shortId: text('shortId'),
    goalId: uuid('goalId').notNull(),
    value: integer('value').notNull(),
    date: timestamp('date', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    // TODO: make this a notNull field
    userId: uuid('userId'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      mode: 'string',
    })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => {
    return {
      shortIdKey: uniqueIndex('entry_shortId_key').using(
        'btree',
        table.shortId.asc().nullsLast(),
      ),
      entryGoalIdFkey: foreignKey({
        columns: [table.goalId],
        foreignColumns: [goal.id],
        name: 'entry_goalId_fkey',
      })
        .onUpdate('cascade')
        .onDelete('restrict'),
    };
  },
);
