import { addDays, addSeconds } from 'date-fns';

import { DEMO_GOAL_DATA } from '~/constants/setup';

export const INITIAL_DEMO_GOAL_COUNT = 3;

export const DEMO_GOALS = DEMO_GOAL_DATA.map((goal) => ({
  ...goal,
  startDate: addDays(new Date(), goal.startDateOffset),
  targetDate: addDays(new Date(), goal.targetDateOffset),
  createdAt: addSeconds(new Date(), goal.createdAtOffset),
}));

export const DEMO_GOAL_TITLES = {
  progress: DEMO_GOAL_DATA[0].title,
  count: DEMO_GOAL_DATA[1].title,
  boolean: DEMO_GOAL_DATA[2].title,
} as const;
