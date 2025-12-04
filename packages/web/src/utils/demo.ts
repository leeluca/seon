import { i18n } from '@lingui/core';
import { addDays, addSeconds, subDays } from 'date-fns';

import { DEMO_GOAL_DATA } from '~/constants/setup';
import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
import { updateGoalProgress } from '~/services/progress';
import type { GoalType } from '~/types/goal';
import { generateUUIDs } from '~/utils';

export const isDemo = import.meta.env.VITE_IS_DEMO === 'true';

export const generateDemoData = async (userId: string) => {
  const goalsData = createSampleGoals(userId);

  await Promise.all(
    goalsData.map((goal) => {
      return db.insertInto('goal').values(goal).execute();
    }),
  );

  const allEntries = goalsData.flatMap((goal) =>
    createSampleEntries(goal.id, userId, goal.type as GoalType),
  );

  await Promise.all(
    allEntries.map((entry) => db.insertInto('entry').values(entry).execute()),
  );

  await db.transaction().execute(async (tx) => {
    await Promise.all(goalsData.map((goal) => updateGoalProgress(goal.id, tx)));
  });
};

const createSampleGoals = (userId: string): Database['goal'][] => {
  const today = new Date();

  return DEMO_GOAL_DATA.map((goalData) =>
    createGoal({
      title: i18n._(goalData.title),
      description: i18n._(goalData.description),
      target: goalData.target,
      initialValue: goalData.initialValue,
      startDate: addDays(today, goalData.startDateOffset),
      targetDate: addDays(today, goalData.targetDateOffset),
      unit: i18n._(goalData.unit),
      type: goalData.type,
      userId,
      createdAt: addSeconds(new Date(), goalData.createdAtOffset),
    }),
  );
};

const createGoal = (data: {
  title: string;
  description: string;
  target: number;
  initialValue: number;
  startDate: Date;
  targetDate: Date;
  unit: string;
  type: string;
  userId: string;
  createdAt?: Date;
}): Database['goal'] => {
  const { uuid, shortUuid } = generateUUIDs();
  const createdAt = data.createdAt?.toISOString() ?? new Date().toISOString();

  return {
    id: uuid,
    shortId: shortUuid,
    title: data.title,
    description: data.description,
    target: data.target,
    initialValue: data.initialValue,
    currentValue: data.initialValue,
    startDate: data.startDate.toISOString(),
    targetDate: data.targetDate.toISOString(),
    unit: data.unit,
    createdAt: createdAt,
    updatedAt: createdAt,
    userId: data.userId,
    type: data.type,
    completionDate: null,
    archivedAt: null,
  };
};

const createSampleEntries = (
  goalId: string,
  userId: string,
  goalType: GoalType,
): Database['entry'][] => {
  const today = new Date();
  const entries: Database['entry'][] = [];

  if (goalType === 'PROGRESS') {
    // For progress goals, show steady progress
    const daysAgo = [...Array(7)]
      .map((_, i) => subDays(today, i + 1))
      .reverse();

    let currentProgress = 20;
    daysAgo.forEach((date) => {
      // Add between 10-40 each day
      const increment = 10 + Math.floor(Math.random() * 30);
      currentProgress += increment;

      entries.push(
        createEntry({
          goalId,
          date,
          value: currentProgress,
          userId,
        }),
      );
    });
  } else if (goalType === 'COUNT') {
    // For count goals, show some days with activity
    const daysAgo = [...Array(12)].map((_, i) => subDays(today, i + 1));

    daysAgo.forEach((date, index) => {
      // Skip some days randomly
      if (index % 3 !== 0) {
        const value = 20 + Math.floor(Math.random() * 20);

        entries.push(
          createEntry({
            goalId,
            date,
            value,
            userId,
          }),
        );
      }
    });
  } else if (goalType === 'BOOLEAN') {
    // For boolean goals, add some yes/no entries
    const daysAgo = [...Array(5)].map((_, i) => subDays(today, i + 1));

    daysAgo.forEach((date, index) => {
      // Alternate yes and no with more yes than no
      const value = index % 3 === 0 ? 0 : 1;

      entries.push(
        createEntry({
          goalId,
          date,
          value,
          userId,
        }),
      );
    });
  }

  return entries;
};

const createEntry = (data: {
  goalId: string;
  date: Date;
  value: number;
  userId: string;
}): Database['entry'] => {
  const { uuid, shortUuid } = generateUUIDs();
  const now = new Date().toISOString();

  return {
    id: uuid,
    shortId: shortUuid,
    goalId: data.goalId,
    value: data.value,
    date: data.date.toISOString(),
    createdAt: now,
    updatedAt: now,
    userId: data.userId,
  };
};
