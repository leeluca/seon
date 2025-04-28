import { addDays, addSeconds, subDays } from 'date-fns';

export const INITIAL_DEMO_GOAL_COUNT = 3;

export const DEMO_GOALS = [
  // PROGRESS type
  {
    title: 'Read "Brave New World"',
    description: 'Finish reading the 288-page book',
    target: 288,
    initialValue: 0,
    startDate: subDays(new Date(), 10),
    targetDate: addDays(new Date(), 20),
    unit: 'pages',
    type: 'PROGRESS',
    createdAt: addSeconds(new Date(), 10),
  },

  // COUNT type
  {
    title: 'Learn 1000 French words',
    description: 'Improve French vocabulary',
    target: 1000,
    initialValue: 0,
    startDate: subDays(new Date(), 14),
    targetDate: addDays(new Date(), 100),
    unit: 'words',
    type: 'COUNT',
    createdAt: addSeconds(new Date(), 5),
  },

  // BOOLEAN type
  {
    title: 'Wake up at 7 AM',
    description: 'Wake up early every day',
    target: 30,
    initialValue: 0,
    startDate: subDays(new Date(), 5),
    targetDate: addDays(new Date(), 25),
    unit: 'days',
    type: 'BOOLEAN',
    createdAt: new Date(),
  },
] as const;
