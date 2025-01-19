import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
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
    useSync: boolean('useSync'),
    preferences: jsonb().$type<{
      language?: 'en' | 'ko';
    }>(),
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

export const goalType = pgEnum('GoalType', ['COUNT', 'PROGRESS', 'BOOLEAN']);

export const goal = pgTable(
  'goal',
  {
    id: uuid('id').primaryKey().notNull(),
    shortId: text('shortId'),
    title: text('title').notNull(),
    description: text('description'),
    initialValue: integer('initialValue').default(0).notNull(),
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
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    type: goalType('type').default('COUNT').notNull(),
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
        .onDelete('cascade'),
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
    userId: uuid('userId').notNull(),
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
        .onDelete('cascade'),
      entryUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: 'entry_userId_fkey',
      })
        .onUpdate('cascade')
        .onDelete('cascade'),
    };
  },
);

export const refreshToken = pgTable(
  'refresh_token',
  {
    id: serial('id').primaryKey().notNull(),
    token: text('token').unique().notNull(),
    userId: uuid('userId').notNull(),
    expiration: timestamp('expiration', {
      precision: 3,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      refreshTokenUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: 'refresh_token_userId_fkey',
      })
        .onUpdate('cascade')
        .onDelete('cascade'),
      refreshTokenTokenUnique: unique('refresh_token_token_unique').on(
        table.token,
      ),
    };
  },
);
