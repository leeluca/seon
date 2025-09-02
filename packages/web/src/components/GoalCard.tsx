import { useCallback, useMemo, useRef } from 'react';
import { msg, type MacroMessageDescriptor } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  isBefore,
  startOfDay,
} from 'date-fns';
import { Maximize2Icon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { GOALS } from '~/constants/query';
import type { Database } from '~/lib/powersync/AppSchema';
import { deleteGoal } from '~/services/goal';
import { cn } from '~/utils';
import CalendarHeatmap from './CalendarHeatmap';
import { Button, buttonVariants } from './ui/button';
import { ResponsivePopover } from './ui/responsive-popover';
import { ResponsiveTooltip } from './ui/responsive-tooltip';

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
      className="w-[calc(100% + 48px)] bg-muted group relative -mx-1 flex h-3 rounded sm:mx-1"
    >
      <p className="absolute bottom-[17px] right-[2px] pb-px text-xs opacity-0 group-hover:opacity-100">
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
function getProgressIconAndMessage(
  status: ProgressStatus,
  t: (descriptor: MacroMessageDescriptor) => string,
) {
  switch (status) {
    case 'behind':
      return {
        icon: '😟',
        message: t(msg`Behind schedule!`),
        progressStatus: status,
      };
    case 'onTrack':
      return {
        icon: '🙂',
        message: t(msg`Right on track!`),
        progressStatus: status,
      };
    case 'ahead':
      return {
        icon: '😎',
        message: t(msg`Ahead of schedule!`),
        progressStatus: status,
      };
    case 'complete':
      return {
        icon: '🥳',
        message: t(msg`Goal achieved!`),
        progressStatus: status,
      };
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
}
function getProgressStatus({
  currentValue,
  initialValue,
  target,
  startDate,
  targetDate,
}: getProgressStatusArgs): ProgressStatus {
  const daysUntilTarget = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(targetDate),
  });

  const averageItemsPerDay = (target - initialValue) / daysUntilTarget.length;

  const daysSince =
    differenceInCalendarDays(new Date(), new Date(startDate)) + 1;

  const expectedGoalValueToday = Math.min(
    daysSince * averageItemsPerDay + initialValue,
    target,
  );

  const differenceFromTarget = currentValue - expectedGoalValueToday;
  const percentageDifference =
    Math.abs(differenceFromTarget / (target - initialValue || 1)) * 100;

  if (currentValue >= target) {
    return 'complete';
  }
  if (percentageDifference <= 5) {
    return 'onTrack';
  }
  if (differenceFromTarget > 0) {
    return 'ahead';
  }
  return 'behind';
}

export default function GoalCard({
  title,
  target,
  id,
  startDate,
  targetDate,
  initialValue,
  shortId,
  currentValue: baseCurrentValue,
  onDeleteSuccess,
}: Database['goal'] & { onDeleteSuccess?: () => void }) {
  const { t } = useLingui();
  const cardRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef(null);
  const currentValue = baseCurrentValue ?? initialValue;
  const queryClient = useQueryClient();
  const progressPercent = Math.max(
    Math.min((currentValue / target) * 100, 100),
    0,
  );

  const {
    icon: progressIcon,
    message: progressMessage,
    progressStatus,
  } = useMemo(
    () =>
      getProgressIconAndMessage(
        getProgressStatus({
          currentValue: currentValue,
          initialValue,
          target,
          startDate,
          targetDate,
        }),
        t,
      ),
    [currentValue, initialValue, target, startDate, targetDate, t],
  );
  const checkBlockedDateFn = useCallback(
    (date: Date) => isBefore(startOfDay(date), startOfDay(startDate)),
    [startDate],
  );

  return (
    <Card
      className="shadow-xs w-full max-w-[600px] rounded-2xl text-center"
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
      <CardFooter className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="flex w-full justify-start">
          {currentValue ? (
            <ResponsiveTooltip content={<p>{progressMessage}</p>}>
              <Button
                size="icon-responsive"
                variant="ghost"
                className={cn(
                  'font-noto-emoji animate-[fadeIn_0.2s_ease-in-out_forwards] cursor-default text-2xl font-light opacity-0 sm:text-[22px]',
                  {
                    'text-[26px] sm:text-[23px]': progressStatus === 'complete',
                  },
                )}
                ref={triggerRef}
                onClick={(e) => e.preventDefault()}
                aria-label={t`Goal progress: ${progressMessage}`}
              >
                <div>{progressIcon}</div>
              </Button>
            </ResponsiveTooltip>
          ) : null}
        </div>
        <div className="bg-muted ml-auto flex items-center gap-1 rounded-xl px-2 py-1">
          <ResponsivePopover
            trigger={
              <Button
                size="icon-responsive"
                variant="outline"
                aria-label={t`Delete goal`}
              >
                <Trash2Icon size={18} />
              </Button>
            }
            drawerTitle={t`Delete goal`}
            contentProps={{ sideOffset: 5 }}
          >
            <div className="pb-6 sm:space-y-2 sm:pb-4">
              <h3 className="hidden font-medium leading-none sm:block">
                <Trans>Delete goal</Trans>
              </h3>
              <p className="text-muted-foreground text-pretty text-sm">
                <Trans>
                  Are you sure you want to delete{' '}
                  <span className="font-bold">{title}</span>?
                </Trans>
              </p>
            </div>
            <div className="grid gap-4">
              <Button
                variant="destructive"
                size="responsive"
                onClick={() => {
                  void deleteGoal(id, () => {
                    queryClient.invalidateQueries({
                      queryKey: GOALS.all.queryKey,
                    });
                    onDeleteSuccess?.();
                    toast.success(t`Deleted goal: ${title}`);
                  });
                }}
              >
                <Trans>Delete</Trans>
              </Button>
            </div>
          </ResponsivePopover>
          <Link
            to="/goals/$id"
            params={{ id }}
            mask={{
              to: '/goals/$id',
              params: { id: shortId },
            }}
            aria-label={t`Toggle goal details`}
            className={buttonVariants({
              variant: 'outline',
              size: 'icon-responsive',
            })}
          >
            <Maximize2Icon size={18} />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
