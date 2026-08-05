import { differenceInCalendarDays, eachDayOfInterval } from 'date-fns';

export type ProgressStatus = 'behind' | 'onTrack' | 'ahead' | 'complete';

interface GetProgressStatusArgs {
  currentValue: number;
  initialValue: number;
  target: number;
  startDate: string;
  targetDate: string;
}

export function getProgressStatus({
  currentValue,
  initialValue,
  target,
  startDate,
  targetDate,
}: GetProgressStatusArgs): ProgressStatus {
  const daysUntilTarget = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(targetDate),
  });

  const averageItemsPerDay = (target - initialValue) / daysUntilTarget.length;
  const daysSince = Math.max(
    0,
    differenceInCalendarDays(new Date(), new Date(startDate)) + 1,
  );
  const expectedGoalValueToday = Math.min(
    daysSince * averageItemsPerDay + initialValue,
    target,
  );
  const differenceFromTarget = currentValue - expectedGoalValueToday;
  const percentageDifference =
    Math.abs(differenceFromTarget / (target - initialValue || 1)) * 100;

  if (currentValue >= target) return 'complete';
  if (percentageDifference <= 5) return 'onTrack';
  if (differenceFromTarget > 0) return 'ahead';
  return 'behind';
}
