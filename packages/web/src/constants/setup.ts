import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

const descriptorToString = (descriptor: MessageDescriptor) =>
  descriptor.message ?? descriptor.id ?? '';

export const DEMO_GOAL_DATA = [
  // PROGRESS type
  {
    title: msg`Read "Brave New World"`,
    description: msg`Finish reading the 288-page book`,
    unit: msg`pages`,
    type: 'PROGRESS',
    target: 288,
    initialValue: 0,
    startDateOffset: -10,
    targetDateOffset: 20,
    createdAtOffset: 2,
  },
  // COUNT type
  {
    title: msg`Learn 1000 French words`,
    description: msg`Improve French vocabulary`,
    unit: msg`words`,
    type: 'COUNT',
    target: 1000,
    initialValue: 0,
    startDateOffset: -14,
    targetDateOffset: 100,
    createdAtOffset: 1,
  },
  // BOOLEAN type
  {
    title: msg`Wake up at 7 AM`,
    description: msg`Wake up early every day`,
    unit: msg`days`,
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
