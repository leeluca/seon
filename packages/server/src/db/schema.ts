import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type { SyncRejection } from '../types/sync.js';

export const user = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('emailVerified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('createdAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex('user_email_key').on(table.email)],
);

export const session = pgTable(
  'session',
  {
    id: uuid('id').primaryKey().notNull(),
    expiresAt: timestamp('expiresAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('createdAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('session_token_key').on(table.token),
    index('session_userId_idx').on(table.userId),
  ],
);

export const account = pgTable(
  'account',
  {
    id: uuid('id').primaryKey().notNull(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    }),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('createdAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: uuid('id').primaryKey().notNull(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expiresAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('createdAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const jwks = pgTable('jwks', {
  id: uuid('id').primaryKey().notNull(),
  publicKey: text('publicKey').notNull(),
  privateKey: text('privateKey').notNull(),
  createdAt: timestamp('createdAt', {
    precision: 3,
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    precision: 3,
    withTimezone: true,
    mode: 'date',
  }),
});

export type UserPreferences = {
  language?: 'en' | 'ko' | 'pt';
  defaultGoalSort?:
    | 'createdAt desc'
    | 'createdAt asc'
    | 'targetDate desc'
    | 'targetDate asc'
    | 'title asc'
    | 'title desc';
  defaultGoalFilter?: 'all' | 'ongoing' | 'completed' | 'archived';
};

export const profile = pgTable('profile', {
  userId: uuid('userId')
    .primaryKey()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  shortId: text('shortId').unique(),
  createdAt: timestamp('createdAt', {
    precision: 3,
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updatedAt', {
    precision: 3,
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  useSync: boolean('useSync').default(false).notNull(),
  preferences: jsonb().$type<UserPreferences>(),
});

export const goalType = pgEnum('GoalType', ['COUNT', 'PROGRESS', 'BOOLEAN']);

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
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    targetDate: timestamp('targetDate', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('createdAt', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    completionDate: timestamp('completionDate', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    }),
    archivedAt: timestamp('archivedAt', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    }),
    type: goalType('type').default('COUNT').notNull(),
  },
  (table) => [
    uniqueIndex('goal_shortId_key').using(
      'btree',
      table.shortId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'goal_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const entry = pgTable(
  'entry',
  {
    id: uuid('id').primaryKey().notNull(),
    shortId: text('shortId'),
    goalId: uuid('goalId').notNull(),
    value: integer('value').notNull(),
    date: timestamp('date', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('createdAt', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
    userId: uuid('userId').notNull(),
  },
  (table) => [
    uniqueIndex('entry_shortId_key').using(
      'btree',
      table.shortId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.goalId],
      foreignColumns: [goal.id],
      name: 'entry_goalId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'entry_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export type SyncTransactionStatus = 'pending' | 'applied' | 'rejected';

/**
 * Upload receipts make browser retries safe. `clientId` is the stable UUID
 * stored in the workspace descriptor, not PowerSync's numeric CRUD op id.
 */
export const syncTransaction = pgTable(
  'sync_transaction',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clientId: uuid('clientId').notNull(),
    transactionId: text('transactionId').notNull(),
    status: text('status').$type<SyncTransactionStatus>().notNull(),
    rejections: jsonb('rejections')
      .$type<SyncRejection[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    createdAt: timestamp('createdAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('sync_transaction_client_key').on(
      table.userId,
      table.clientId,
      table.transactionId,
    ),
    index('sync_transaction_userId_idx').on(table.userId),
  ],
);
