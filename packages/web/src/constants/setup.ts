// TODO: add translations for title and description fields
export const DEMO_GOAL_DATA = [
  // PROGRESS type
  {
    title: 'Read "Brave New World"',
    description: 'Finish reading the 288-page book',
    target: 288,
    initialValue: 0,
    startDateOffset: -10,
    targetDateOffset: 20,
    unit: 'pages',
    type: 'PROGRESS',
    createdAtOffset: 2,
  },
  // COUNT type
  {
    title: 'Learn 1000 French words',
    description: 'Improve French vocabulary',
    target: 1000,
    initialValue: 0,
    startDateOffset: -14,
    targetDateOffset: 100,
    unit: 'words',
    type: 'COUNT',
    createdAtOffset: 1,
  },
  // BOOLEAN type
  {
    title: 'Wake up at 7 AM',
    description: 'Wake up early every day',
    target: 30,
    initialValue: 0,
    startDateOffset: -5,
    targetDateOffset: 25,
    unit: 'days',
    type: 'BOOLEAN',
    createdAtOffset: 0,
  },
] as const;
