import { relations } from "drizzle-orm/relations";
import { user, goal, entry } from "./schema";

export const goalRelations = relations(goal, ({one, many}) => ({
	user: one(user, {
		fields: [goal.userId],
		references: [user.id]
	}),
	entries: many(entry),
}));

export const userRelations = relations(user, ({many}) => ({
	goals: many(goal),
}));

export const entryRelations = relations(entry, ({one}) => ({
	goal: one(goal, {
		fields: [entry.goalId],
		references: [goal.id]
	}),
}));