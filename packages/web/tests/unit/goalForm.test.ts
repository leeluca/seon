import { describe, expect, it } from 'vitest';

import type { Database } from '~/data/db/AppSchema';
import {
  createGoalFormValues,
  goalFormValuesToPayload,
  goalToFormValues,
  type GoalFormValues,
} from '~/features/goal/model/form';

describe('goal form values', () => {
  it('creates normalized defaults for a new goal', () => {
    const values = createGoalFormValues();

    expect(values).toMatchObject({
      title: '',
      targetValue: 0,
      unit: '',
      initialValue: 0,
      type: 'COUNT',
    });
    expect(values.startDate.getHours()).toBe(0);
    expect(values.targetDate).toBeInstanceOf(Date);
  });

  it('maps a stored goal into editable form values', () => {
    const goal: Database['goal'] = {
      id: 'goal-id',
      shortId: 'goal',
      title: 'Read more',
      description: null,
      target: 12,
      unit: 'books',
      startDate: '2026-07-01T00:00:00.000Z',
      targetDate: '2026-12-31T00:00:00.000Z',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      initialValue: 2,
      type: 'PROGRESS',
      currentValue: 2,
      completionDate: null,
      archivedAt: null,
    };

    expect(goalToFormValues(goal)).toEqual({
      title: 'Read more',
      targetValue: 12,
      unit: 'books',
      startDate: new Date(goal.startDate),
      targetDate: new Date(goal.targetDate),
      initialValue: 2,
      type: 'PROGRESS',
    });
  });

  it('normalizes values into the persistence payload', () => {
    const values: GoalFormValues = {
      title: '  Read more  ',
      targetValue: 12,
      unit: '  books ',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      targetDate: new Date('2026-12-31T00:00:00.000Z'),
      initialValue: 2,
      type: 'PROGRESS',
    };

    expect(goalFormValuesToPayload(values)).toMatchObject({
      title: 'Read more',
      target: 12,
      unit: 'books',
      startDate: '2026-07-01T00:00:00.000Z',
      targetDate: '2026-12-31T00:00:00.000Z',
    });
  });

  it('does not create a payload when required values are absent', () => {
    const values = createGoalFormValues();

    expect(
      goalFormValuesToPayload({ ...values, targetValue: undefined }),
    ).toBeUndefined();
    expect(
      goalFormValuesToPayload({ ...values, targetDate: undefined }),
    ).toBeUndefined();
  });
});
