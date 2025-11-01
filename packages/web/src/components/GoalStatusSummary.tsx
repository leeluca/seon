import { plural, t } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { useQuery } from '@tanstack/react-query';
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
        className={cn('text-muted-foreground text-sm', {
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

  const entriesSum = goal?.currentValue ?? 0;

  if (!goal || isLoadingEntries) return null;

  const startDate = new Date(goal.startDate);
  const targetDate = new Date(goal.targetDate);

  const isGoalCompleted = entriesSum >= goal.target;
  const isPastTargetDate = !checkIsToday(targetDate) && checkIsPast(targetDate);

  const daysRemaining = Math.max(
    differenceInCalendarDays(targetDate, new Date()) + 1,
    0,
  );

  let averagePerDay: number;

  const calculateDaysElapsed = (endDate: Date, stDate: Date) =>
    Math.max(differenceInCalendarDays(endDate, stDate) + 1, 1);

  if (isGoalCompleted) {
    const completionDate = goal.completionDate
      ? new Date(goal.completionDate)
      : targetDate;
    const daysElapsed = calculateDaysElapsed(completionDate, startDate);
    averagePerDay = entriesSum / daysElapsed;
  } else if (isPastTargetDate) {
    const daysElapsed = calculateDaysElapsed(targetDate, startDate);
    averagePerDay = entriesSum / daysElapsed;
  } else {
    const daysElapsed = calculateDaysElapsed(new Date(), startDate);
    averagePerDay = entriesSum / daysElapsed;
  }

  const remaining = Math.max(goal.target - entriesSum, 0);

  // NOTE: If an entry was added today, consider today's contribution complete and start counting needed days from tomorrow.
  const hasEntryToday = entries.some((entry) => checkIsToday(entry.date));

  const adjustedDaysRemaining = hasEntryToday
    ? Math.max(daysRemaining - 1, 0)
    : daysRemaining;
  const averageNeededPerDay = isPastTargetDate
    ? 0
    : remaining / Math.max(adjustedDaysRemaining, 1);

  const estimatedCompletionDate =
    (averagePerDay > 0 &&
      !isGoalCompleted &&
      remaining > 0 &&
      (() => {
        const daysNeeded = remaining / averagePerDay;
        let daysToAdd = Math.max(Math.ceil(daysNeeded) - 1, 0);

        if (hasEntryToday) {
          daysToAdd += 1;
        }

        return formatDate(addDays(new Date(), daysToAdd), 'PP');
      })()) ||
    (isGoalCompleted ? t`Completed!` : '-');

  // Calculate today's expected value based on required pace
  // const daysElapsedSinceStart = calculateDaysElapsed(new Date(), startDate);
  // const requiredPacePerDay =
  //   goal.target /
  //   Math.max(differenceInCalendarDays(targetDate, startDate) + 1, 1);
  // const todaysExpectedValue =
  //   isGoalCompleted || isPastTargetDate
  //     ? entriesSum
  //     : Math.min(requiredPacePerDay * daysElapsedSinceStart, goal.target);

  return (
    <div
      className={cn(
        'bg-secondary/30 border-secondary flex flex-wrap items-center justify-around gap-5 rounded-xl border p-5',
        className,
      )}
    >
      <StatusItem
        label={t`Progress`}
        value={t`${entriesSum} / ${goal.target}`}
      />
      {/* <StatusSeparator /> */}
      {/* <StatusItem
        label={t`Target today`}
        value={todaysExpectedValue.toFixed(1)}
      /> */}
      <StatusSeparator />
      <StatusItem
        label={t`Time Left`}
        value={plural(daysRemaining, {
          one: '# day',
          other: '# days',
        })}
      />
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
      <StatusItem label={t`Estimated Date`} value={estimatedCompletionDate} />
    </div>
  );
}
