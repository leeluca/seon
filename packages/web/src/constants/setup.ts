import type { MessageDescriptor } from '@lingui/core';

const descriptorToString = (descriptor: MessageDescriptor) =>
  descriptor.message ?? descriptor.id ?? '';

const PROGRESS_GOAL_TITLE: MessageDescriptor = /*i18n*/ {
  id: 'Read "Brave New World"',
  message: 'Read "Brave New World"',
};
const PROGRESS_GOAL_DESCRIPTION: MessageDescriptor = /*i18n*/ {
  id: 'Finish reading the 288-page book',
  message: 'Finish reading the 288-page book',
};
const PROGRESS_GOAL_UNIT: MessageDescriptor = /*i18n*/ {
  id: 'pages',
  message: 'pages',
};

const COUNT_GOAL_TITLE: MessageDescriptor = /*i18n*/ {
  id: 'Learn 1000 French words',
  message: 'Learn 1000 French words',
};
const COUNT_GOAL_DESCRIPTION: MessageDescriptor = /*i18n*/ {
  id: 'Improve French vocabulary',
  message: 'Improve French vocabulary',
};
const COUNT_GOAL_UNIT: MessageDescriptor = /*i18n*/ {
  id: 'words',
  message: 'words',
};

const BOOLEAN_GOAL_TITLE: MessageDescriptor = /*i18n*/ {
  id: 'Wake up at 7 AM',
  message: 'Wake up at 7 AM',
};
const BOOLEAN_GOAL_DESCRIPTION: MessageDescriptor = /*i18n*/ {
  id: 'Wake up early every day',
  message: 'Wake up early every day',
};
const BOOLEAN_GOAL_UNIT: MessageDescriptor = /*i18n*/ {
  id: 'days',
  message: 'days',
};

export const DEMO_GOAL_DATA = [
  // PROGRESS type
  {
    title: PROGRESS_GOAL_TITLE,
    description: PROGRESS_GOAL_DESCRIPTION,
    unit: PROGRESS_GOAL_UNIT,
    type: 'PROGRESS',
    target: 288,
    initialValue: 0,
    startDateOffset: -10,
    targetDateOffset: 20,
    createdAtOffset: 2,
  },
  // COUNT type
  {
    title: COUNT_GOAL_TITLE,
    description: COUNT_GOAL_DESCRIPTION,
    unit: COUNT_GOAL_UNIT,
    type: 'COUNT',
    target: 1000,
    initialValue: 0,
    startDateOffset: -14,
    targetDateOffset: 100,
    createdAtOffset: 1,
  },
  // BOOLEAN type
  {
    title: BOOLEAN_GOAL_TITLE,
    description: BOOLEAN_GOAL_DESCRIPTION,
    unit: BOOLEAN_GOAL_UNIT,
    type: 'BOOLEAN',
    target: 30,
    initialValue: 0,
    startDateOffset: -5,
    targetDateOffset: 25,
    createdAtOffset: 0,
  },
] as const;

export const DEMO_GOAL_CONTENT = DEMO_GOAL_DATA.map(
  ({ title, description, unit, ...rest }) => ({
    ...rest,
    title: descriptorToString(title),
    description: descriptorToString(description),
    unit: descriptorToString(unit),
  }),
);

export const DEMO_GOAL_TITLES = {
  progress: DEMO_GOAL_CONTENT[0].title,
  count: DEMO_GOAL_CONTENT[1].title,
  boolean: DEMO_GOAL_CONTENT[2].title,
} as const;
