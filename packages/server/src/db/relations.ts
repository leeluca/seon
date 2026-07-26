import { relations } from 'drizzle-orm/relations';

import {
  account,
  entry,
  goal,
  profile,
  session,
  syncTransaction,
  user,
} from './schema.js';

export const goalRelations = relations(goal, ({ one, many }) => ({
  user: one(user, {
    fields: [goal.userId],
    references: [user.id],
  }),
  entries: many(entry),
}));

export const userRelations = relations(user, ({ many, one }) => ({
  goals: many(goal),
  entries: many(entry),
  sessions: many(session),
  accounts: many(account),
  profile: one(profile),
  syncTransactions: many(syncTransaction),
}));

export const entryRelations = relations(entry, ({ one }) => ({
  goal: one(goal, {
    fields: [entry.goalId],
    references: [goal.id],
  }),
  user: one(user, {
    fields: [entry.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, {
    fields: [profile.userId],
    references: [user.id],
  }),
}));

export const syncTransactionRelations = relations(
  syncTransaction,
  ({ one }) => ({
    user: one(user, {
      fields: [syncTransaction.userId],
      references: [user.id],
    }),
  }),
);
