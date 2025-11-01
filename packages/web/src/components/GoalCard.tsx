import { useCallback, useRef } from 'react';
import { useLingui } from '@lingui/react/macro';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  isBefore,
  startOfDay,
} from 'date-fns';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import type { Database } from '~/lib/powersync/AppSchema';
import { cn } from '~/utils';
import CalendarHeatmap from './CalendarHeatmap';
import { RouterLink } from './ui/router-link';

interface ProgressBarProps {
  progressPercent: number;
  target: number;
  currentValue: number;
}

function ProgressBar({
  progressPercent,
  target,
  currentValue,
}: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={currentValue}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuetext={`${currentValue.toFixed(0)}/${target}`}
      tabIndex={-1}
      data-interactive
      className="w-[calc(100% + 48px)] bg-muted group relative -mx-1 flex h-3 cursor-default rounded sm:mx-1"
    >
      <p className="absolute right-0.5 bottom-[17px] pb-px text-xs opacity-0 group-hover:opacity-100">
        {progressPercent <= 100
          ? `${currentValue.toFixed(0)}/${target}`
          : target}
      </p>
      <div
        className="relative h-3 rounded bg-cyan-500/30 transition-all group-hover:border-cyan-500 group-hover:shadow-[0_0_5px] group-hover:shadow-blue-300"
        style={{ width: `${Math.max(progressPercent, 2)}%` }}
      >
        <p
          className={cn(
            'absolute bottom-4 pb-px text-sm opacity-0 transition-opacity group-hover:opacity-100',
            progressPercent <= 85 ? '-right-5' : 'right-0 -bottom-6',
          )}
        >
          {progressPercent.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}

// type ProgressStatus = 'behind' | 'onTrack' | 'ahead' | 'complete';
// function getProgressIconAndMessage(
//   status: ProgressStatus,
//   t: (descriptor: MacroMessageDescriptor) => string,
// ) {
//   switch (status) {
//     case 'behind':
//       return {
//         icon: '😟',
//         message: t(msg`Behind schedule!`),
//         progressStatus: status,
//       };
//     case 'onTrack':
//       return {
//         icon: '🙂',
//         message: t(msg`Right on track!`),
//         progressStatus: status,
//       };
//     case 'ahead':
//       return {
//         icon: '😎',
//         message: t(msg`Ahead of schedule!`),
//         progressStatus: status,
//       };
//     case 'complete':
//       return {
//         icon: '🥳',
//         message: t(msg`Goal achieved!`),
//         progressStatus: status,
//       };
//     default:
//       return { icon: '', message: '', progressStatus: status };
//   }
// }

// interface getProgressStatusArgs {
//   currentValue: number;
//   initialValue: number;
//   target: number;
//   startDate: string;
//   targetDate: string;
// }
// function getProgressStatus({
//   currentValue,
//   initialValue,
//   target,
//   startDate,
//   targetDate,
// }: getProgressStatusArgs): ProgressStatus {
//   const daysUntilTarget = eachDayOfInterval({
//     start: new Date(startDate),
//     end: new Date(targetDate),
//   });

//   const averageItemsPerDay = (target - initialValue) / daysUntilTarget.length;

//   const daysSince =
//     differenceInCalendarDays(new Date(), new Date(startDate)) + 1;

//   const expectedGoalValueToday = Math.min(
//     daysSince * averageItemsPerDay + initialValue,
//     target,
//   );

//   const differenceFromTarget = currentValue - expectedGoalValueToday;
//   const percentageDifference =
//     Math.abs(differenceFromTarget / (target - initialValue || 1)) * 100;

//   if (currentValue >= target) {
//     return 'complete';
//   }
//   if (percentageDifference <= 5) {
//     return 'onTrack';
//   }
//   if (differenceFromTarget > 0) {
//     return 'ahead';
//   }
//   return 'behind';
// }
export default function GoalCard({
  title,
  target,
  id,
  startDate,
  initialValue,
  shortId,
  currentValue: baseCurrentValue,
}: Database['goal']) {
  const { t } = useLingui();
  const cardRef = useRef<HTMLDivElement>(null);
  const currentValue = baseCurrentValue ?? initialValue;
  const progressPercent = Math.max(
    Math.min((currentValue / target) * 100, 100),
    0,
  );

  const checkBlockedDateFn = useCallback(
    (date: Date) => isBefore(startOfDay(date), startOfDay(startDate)),
    [startDate],
  );

  return (
    <RouterLink
      to="/goals/$id"
      params={{ id }}
      mask={{
        to: '/goals/$id',
        params: { id: shortId },
      }}
      aria-label={t`Toggle goal details`}
    >
      <Card
        className="w-full max-w-[600px] rounded-2xl text-center shadow-xs"
        ref={cardRef}
        data-testid={`goal-card-${id}`}
      >
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
          <div className="flex h-12 items-center sm:h-14">
            <CardTitle className="mr-3 w-60 grow text-center text-xl font-medium sm:text-2xl">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-5 pb-5 sm:gap-6 sm:px-6 sm:pb-6">
          <CalendarHeatmap
            goalId={id}
            checkBlockedDateFn={checkBlockedDateFn}
            blockedDateFeedback={t`Before goal's start date`}
            className="-mx-2 sm:mx-0"
          />
          <div className="flex flex-col gap-2">
            <ProgressBar
              progressPercent={progressPercent}
              target={target}
              currentValue={currentValue}
            />
          </div>
        </CardContent>
        <CardFooter className="px-4 pb-4 sm:px-6 sm:pb-6" />
      </Card>
    </RouterLink>
  );
}
