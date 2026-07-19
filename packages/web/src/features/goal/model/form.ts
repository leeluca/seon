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
    targetValue: goal.target,
    unit: goal.unit,
    startDate: new Date(goal.startDate),
    targetDate: new Date(goal.targetDate),
    initialValue: goal.initialValue ?? 0,
    type: goal.type as GoalType,
  };
}

export function goalFormValuesToPayload(values: GoalFormValues) {
  const { targetValue, targetDate } = values;

  if (targetValue === undefined || targetDate === undefined) {
    return;
  }

  return {
    ...values,
    title: values.title.trim(),
    unit: values.unit.trim(),
    target: targetValue,
    startDate: values.startDate.toISOString(),
    targetDate: targetDate.toISOString(),
  };
}
