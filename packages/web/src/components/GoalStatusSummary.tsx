import { t } from '@lingui/core/macro';
import { useQuery } from '@powersync/tanstack-react-query';
import {
  addDays,
  isPast as checkIsPast,
  isToday as checkIsToday,
  differenceInCalendarDays,
  formatDate,
} from 'date-fns';

import { ENTRIES, GOALS } from '~/constants/query';
import type { GoalType } from '~/types/goal';
import { cn } from '~/utils';
import { Separator } from './ui/separator';

interface StatusItemProps {
  label: string;
  value: string;
}

function StatusItem({ label, value }: StatusItemProps) {
  return (
    <div className="flex flex-col items-center">
      <h5 className="text-center font-medium">{label}</h5>
      <p className="text-sm font-light text-gray-700">{value}</p>
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

  const { data: totalValue, isLoading: isLoadingEntries } = useQuery(
    ENTRIES.entriesSum(goalId, goal?.type as GoalType),
  );
  const { data: entries } = useQuery(ENTRIES.goalId(goalId));

  //   TODO: calculate values for when there are no entries
  if (!goal || isLoadingEntries || !entries?.length) return null;

  const entriesSum = Number(totalValue?.totalValue ?? 0);
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
      (differenceInCalendarDays(
        entries[entries?.length - 1].date,
        goal.startDate,
      ) -
        1);
  } else if (isPastTargetDate) {
    averagePerDay =
      entriesSum /
      (differenceInCalendarDays(goal.targetDate, goal.startDate) - 1);
  } else {
    averagePerDay =
      entriesSum / (differenceInCalendarDays(new Date(), goal.startDate) - 1);
  }

  const remaining = Math.max(goal.target - entriesSum, 0);

  const averageNeededPerDay =
    remaining / differenceInCalendarDays(goal.targetDate, new Date()) + 1;

  const estimatedCompletionDate = isGoalCompleted
    ? 'Completed!'
    : formatDate(
        addDays(new Date(), Math.max(remaining / averagePerDay - 1, 0)),
        'PP',
      );

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-around gap-5 rounded-xl bg-gray-100 px-6 py-5',
        className,
      )}
    >
      <StatusItem
        label={t`Progress`}
        value={`${entriesSum} / ${goal.target}`}
      />
      <StatusSeparator />
      <StatusItem label={t`Time Left`} value={t`${daysRemaining} days`} />
      <StatusSeparator />
      <StatusItem
        label={t`Average Pace`}
        value={`${averagePerDay.toFixed(1)}/day`}
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
