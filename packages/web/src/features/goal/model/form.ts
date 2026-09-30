import { formOptions } from '@tanstack/react-form';
import { add, startOfDay } from 'date-fns';

import type { Database } from '~/data/db/AppSchema';
import type { GoalType } from './types';

export interface GoalFormValues {
  title: string;
  targetValue?: number;
  unit: string;
  startDate: Date;
  targetDate?: Date;
  initialValue: number;
  type: GoalType;
}

const goalFormDefaults: GoalFormValues = {
  title: '',
  targetValue: 0,
  unit: '',
  startDate: new Date(0),
  targetDate: undefined,
  initialValue: 0,
  type: 'COUNT',
};

export const goalFormOptions = formOptions({
  defaultValues: goalFormDefaults,
});

export function createGoalFormValues(): GoalFormValues {
  const today = startOfDay(new Date());

  return {
    title: '',
    targetValue: 0,
    unit: '',
    startDate: today,
    targetDate: add(today, { months: 1 }),
    initialValue: 0,
    type: 'COUNT',
  };
}

export function goalToFormValues(goal: Database['goal']): GoalFormValues {
  return {
    title: goal.title,
    targetValue: goal.target ?? undefined,
    unit: goal.unit,
    startDate: new Date(goal.startDate),
    targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
    initialValue: goal.initialValue ?? 0,
    type: goal.type as GoalType,
  };
}

/**
 * Whether the values describe a habit with no target. Those are
 * open-ended: they store no target and no target date.
 */
export function isOpenEndedGoal(
  values: Pick<GoalFormValues, 'type' | 'targetValue'>,
) {
  return values.type === 'BOOLEAN' && !values.targetValue;
}

export function goalFormValuesToPayload(values: GoalFormValues) {
  const { targetValue, targetDate } = values;
  const base = {
    ...values,
    title: values.title.trim(),
    unit: values.unit.trim(),
    startDate: values.startDate.toISOString(),
  };

  if (isOpenEndedGoal(values)) {
    return { ...base, target: null, targetDate: null };
  }

  if (!targetValue || targetDate === undefined) {
    return;
  }

  return {
    ...base,
    target: targetValue,
    targetDate: targetDate.toISOString(),
  };
}
