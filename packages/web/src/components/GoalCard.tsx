import type { Database } from '~/lib/powersync/AppSchema';

import { useMemo, useRef } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  isBefore,
  startOfDay,
} from 'date-fns';
import { Maximize2Icon, Trash2Icon } from 'lucide-react';
// import { motion } from 'framer-motion';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import useGoalEntriesSum from '~/hooks/useGoalEntriesSum';
import db from '~/lib/database';
import { cn } from '~/utils';
import CalendarHeatmap from './CalendarHeatmap';
import { Button, buttonVariants } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { t } from '@lingui/core/macro';

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
    <div className="w-[calc(100% + 48px)] group relative -mx-3 flex h-3 rounded bg-gray-200">
      <p className="absolute bottom-[17px] right-[2px] pb-[1px] text-xs font-light">
        {progressPercent <= 100 ? `${currentValue}/${target}` : target}
      </p>
      <div
        className="relative h-3 rounded border bg-blue-200 transition-all group-hover:border-blue-300 group-hover:shadow-[0_0_5px] group-hover:shadow-blue-300"
        style={{ width: `${Math.max(progressPercent, 2)}%` }}
      >
        <p
          className={cn(
            'absolute bottom-4 pb-[1px] text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100',
            progressPercent <= 85 ? '-right-5' : '-bottom-6 right-0',
          )}
        >
          {progressPercent.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}

type ProgressStatus = 'behind' | 'onTrack' | 'ahead' | 'complete';
function getProgressIconAndMessage(status: ProgressStatus) {
  switch (status) {
    case 'behind':
      return {
        icon: '😟',
        message: t`Behind schedule!`,
        progressStatus: status,
      };
    case 'onTrack':
      return { icon: '🙂', message: t`Right on track!`, progressStatus: status };
    case 'ahead':
      return {
        icon: '😎',
        message: t`Ahead of schedule!`,
        progressStatus: status,
      };
    case 'complete':
      return { icon: '🥳', message: t`Goal achieved!`, progressStatus: status };
    default:
      return { icon: '', message: '' };
  }
}

interface getProgressStatusArgs {
  currentValue: number;
  initialValue: number;
  target: number;
  startDate: string;
  targetDate: string;
  isCompleted: boolean;
}
function getProgressStatus({
  currentValue,
  initialValue,
  target,
  startDate,
  targetDate,
  isCompleted,
}: getProgressStatusArgs): ProgressStatus {
  const daysUntilTarget = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(targetDate),
  });

  const averageItemsPerDay = (target - initialValue) / daysUntilTarget.length;

  const daysSince =
    differenceInCalendarDays(new Date(), new Date(startDate)) + 1;

  const expectedGoalValueToday = Math.min(
    daysSince * averageItemsPerDay,
    target,
  );

  const differenceFromTarget = currentValue - expectedGoalValueToday;
  const percentageDifference =
    Math.abs((currentValue - expectedGoalValueToday) / target) * 100;

  if (isCompleted) {
    return 'complete';
  } else if (percentageDifference <= 5) {
    return 'onTrack';
  } else if (differenceFromTarget > 0) {
    return 'ahead';
  } else {
    return 'behind';
  }
}

async function deleteGoal(goalId: string, callback?: () => void) {
  await db.deleteFrom('goal').where('id', '=', goalId).execute();
  callback && callback();
}

export default function GoalCard({
  title,
  target,
  id,
  startDate,
  targetDate,
  initialValue,
  shortId,
}: Database['goal']) {
  const { t } = useLingui();
  const cardRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef(null);

  // FIXME: use a join query instead?
  const { value: entriesSum, isLoading: isLoadingEntries } =
    useGoalEntriesSum(id);

  const currentValue = entriesSum + initialValue;

  const progressPercent = Math.max(
    Math.min((currentValue / target) * 100, 100),
    0,
  );

  const isCompleted = currentValue >= target;

  const {
    icon: progressIcon,
    message: progressMessage,
    progressStatus,
  } = useMemo(
    () =>
      getProgressIconAndMessage(
        getProgressStatus({
          currentValue,
          initialValue,
          target,
          startDate,
          targetDate,
          isCompleted,
        }),
      ),
    [currentValue, initialValue, target, startDate, targetDate, isCompleted],
  );

  return (
    <Card
      className="w-full text-center shadow-sm"
      // whileTap={{ scale: 0.97, transition: { ease: 'easeIn' } }}
      // initial={{ scale: 0 }}
      // animate={{
      //   scale: 1,
      //   transition: {
      //     delay: 0.25,
      //     type: 'tween',
      //   },
      // }}
      // exit={{
      //   opacity: 0,
      //   scale: 0,
      //   transition: {
      //     type: 'tween',
      //   },
      // }}
      // layout
      // transition={{ ease: 'easeInOut' }}
      ref={cardRef}
    >
      <CardHeader className="p-4">
        <div className="flex h-16 items-center">
          <CardTitle className="mr-3 w-60 grow text-center text-2xl font-medium">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-9">
        <CalendarHeatmap
          goalId={id}
          checkBlockedDateFn={(date) =>
            isBefore(startOfDay(date), startOfDay(startDate))
          }
          blockedDateFeedback="Before goal's start date"
        />
        <div className="flex flex-col gap-2">
          <ProgressBar
            progressPercent={progressPercent}
            target={target}
            currentValue={currentValue}
          />
        </div>
      </CardContent>
      <CardFooter className="px-3 pb-3">
        <div className="flex w-full justify-start">
          {!isLoadingEntries && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className={cn(
                    'font-noto-emoji animate-[fadeIn_0.2s_ease-in-out_forwards] cursor-default text-xl font-light opacity-0',
                    {
                      'text-[22px]': progressStatus === 'complete',
                    },
                  )}
                  ref={triggerRef}
                  onClick={(e) => e.preventDefault()}
                >
                  {progressIcon}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                onPointerDownOutside={(event) => {
                  if (event.target === triggerRef.current)
                    event.preventDefault();
                }}
              >
                <p>{progressMessage}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-gray-200/50 px-2 py-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={t`Delete goal`}
              >
                <Trash2Icon size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={5}>
              <div className="space-y-2 pb-4">
                <h3 className="font-medium leading-none">
                  <Trans>Delete goal</Trans>
                </h3>
                <p className="text-muted-foreground text-pretty text-sm">
                  {/* FIXME: Korean translation has wrong word order */}
                  <Trans>
                    Are you sure you want to delete{' '}
                    <span className="font-bold">{title}</span>?
                  </Trans>
                </p>
              </div>
              <div className="grid gap-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    void deleteGoal(id, () =>
                      toast.success(t`Deleted goal: ${title}`),
                    );
                  }}
                >
                  <Trans>Delete</Trans>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Link
            to="/goals/$id"
            params={{ id: shortId }}
            replace
            aria-label={t`Toggle goal details`}
            className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
          >
            <Maximize2Icon size={18} />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
