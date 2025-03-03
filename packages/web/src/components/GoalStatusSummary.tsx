import { useMemo } from 'react';
import { t } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { useQuery } from '@powersync/tanstack-react-query';
import {
  addDays,
  isPast as checkIsPast,
  isToday as checkIsToday,
  differenceInCalendarDays,
  formatDate,
} from 'date-fns';

import type { LOCALES } from '~/constants/locales';
import { ENTRIES, GOALS } from '~/constants/query';
import { cn } from '~/utils';
import { Separator } from './ui/separator';

interface StatusItemProps {
  label: string;
  value: string;
}

function StatusItem({ label, value }: StatusItemProps) {
  const {
    i18n: { locale },
  } = useLingui() as { i18n: { locale: keyof typeof LOCALES } };

  return (
    <div className="flex flex-col items-center">
      <h5 className="text-center font-medium">{label}</h5>
      <p
        className={cn('text-sm text-gray-700', {
          'font-light': locale === 'en',
        })}
      >
        {value}
      </p>
    </div>
  );
}

const StatusSeparator = () => (
  <Separator
    orientation="vertical"
    className="hidden h-9 bg-gray-300 md:block"
  />
);
interface GoalStatusSummaryProps {
  goalId: string;
  className?: string;
}
export function GoalStatusSummary({
  goalId,
  className,
}: GoalStatusSummaryProps) {
  const { data: goal } = useQuery(GOALS.detail(goalId));

  const { data: entries = [], isLoading: isLoadingEntries } = useQuery(
    ENTRIES.goalId(goalId),
  );

  const entriesSum = useMemo(
    () =>
      goal?.type === 'PROGRESS'
        ? (entries[entries.length - 1]?.value ?? 0) + (goal.initialValue ?? 0)
        : entries.reduce((sum, entry) => sum + entry.value, 0) +
          (goal?.initialValue ?? 0),
    [entries, goal],
  );

  if (!goal || isLoadingEntries) return null;

  const isGoalCompleted = entriesSum >= goal.target;
  const isPastTargetDate =
    !checkIsToday(goal.targetDate) && checkIsPast(goal.targetDate);

  const daysRemaining = Math.max(
    differenceInCalendarDays(goal.targetDate, new Date()) + 1,
    0,
  );

  let averagePerDay: number;
  if (isGoalCompleted) {
    averagePerDay =
      entriesSum /
      Math.max(
        differenceInCalendarDays(
          entries[entries.length - 1]?.date ?? goal.targetDate,
          goal.startDate,
        ) - 1,
        1,
      );
  } else if (isPastTargetDate) {
    averagePerDay =
      entriesSum /
      Math.max(
        differenceInCalendarDays(goal.targetDate, goal.startDate) - 1,
        1,
      );
  } else {
    averagePerDay =
      entriesSum /
      Math.max(differenceInCalendarDays(new Date(), goal.startDate) - 1, 1);
  }

  const remaining = Math.max(goal.target - entriesSum, 0);

  const averageNeededPerDay = isPastTargetDate
    ? 0
    : remaining / (differenceInCalendarDays(goal.targetDate, new Date()) + 1);

  const estimatedCompletionDate =
    (averagePerDay &&
      (isGoalCompleted
        ? t`Completed!`
        : formatDate(
            addDays(new Date(), Math.max(remaining / averagePerDay - 1, 0)),
            'PP',
          ))) ||
    '-';

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-around gap-5 rounded-xl bg-gray-100 p-5',
        className,
      )}
    >
      <StatusItem
        label={t`Progress`}
        value={t`${entriesSum} / ${goal.target}`}
      />
      <StatusSeparator />
      <StatusItem label={t`Time Left`} value={t`${daysRemaining} days`} />
      <StatusSeparator />
      <StatusItem
        label={t`Average Pace`}
        value={t`${averagePerDay.toFixed(1)}/day`}
      />
      <StatusSeparator />
      <StatusItem
        label={t`Required Pace`}
        value={
          averageNeededPerDay > 0
            ? t`${averageNeededPerDay.toFixed(1)}/day`
            : '-'
        }
      />
      <StatusSeparator />
      <StatusItem
        label={t`Expected Completion`}
        value={estimatedCompletionDate}
      />
    </div>
  );
}
