import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { msg, plural, type MacroMessageDescriptor } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { differenceInCalendarDays, isBefore, startOfDay } from 'date-fns';
import { ChevronRightIcon, ChevronUpIcon } from 'lucide-react';

import type { Database } from '~/data/db/AppSchema';
import CalendarHeatmap from '~/features/entry/components/CalendarHeatmap';
import {
  getProgressStatus,
  type ProgressStatus,
} from '~/features/goal/goalProgress';
import { buttonVariants } from '~/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '~/shared/components/ui/card';
import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';

const HOLD_REVEAL_DELAY_MS = 100;

interface ProgressBarProps {
  progressPercent: number;
  target: number;
  currentValue: number;
  isRevealed: boolean;
}

function ProgressBar({
  progressPercent,
  target,
  currentValue,
  isRevealed,
}: ProgressBarProps) {
  const isLabelInsideFill = progressPercent > 85;

  return (
    <div
      role="progressbar"
      aria-valuenow={currentValue}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuetext={`${currentValue.toFixed(0)}/${target}`}
      tabIndex={-1}
      data-interactive
      className="bg-muted relative h-5 w-full cursor-default overflow-hidden rounded-md"
    >
      <div
        className="relative h-full rounded-md bg-cyan-500/30 transition-all group-hover/progress:bg-cyan-500/50"
        style={{ width: `${Math.max(progressPercent, 2)}%` }}
      >
        <span
          className={cn(
            'text-foreground/70 absolute inset-y-0 flex items-center text-xs font-medium whitespace-nowrap tabular-nums',
            'opacity-0 transition-opacity group-hover/progress:opacity-100',
            isLabelInsideFill ? 'right-1.5' : 'left-full ml-1.5',
            isRevealed && 'opacity-100',
          )}
        >
          {`${progressPercent.toFixed(0)}%`}
        </span>
      </div>
    </div>
  );
}

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
      return { icon: '', message: '', progressStatus: status };
  }
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
}: Database['goal']) {
  const { t } = useLingui();
  const [isRevealed, setIsRevealed] = useState(false);
  const holdTimerRef = useRef<number | null>(null);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const startHoldReveal = useCallback(
    (event: ReactPointerEvent) => {
      if (event.pointerType === 'mouse') return;
      clearHoldTimer();
      holdTimerRef.current = window.setTimeout(
        () => setIsRevealed(true),
        HOLD_REVEAL_DELAY_MS,
      );
    },
    [clearHoldTimer],
  );

  const endHoldReveal = useCallback(
    (event: ReactPointerEvent) => {
      if (event.pointerType === 'mouse') return;
      clearHoldTimer();
      setIsRevealed(false);
    },
    [clearHoldTimer],
  );

  useEffect(() => clearHoldTimer, [clearHoldTimer]);

  const currentValue = baseCurrentValue ?? initialValue;
  const progressPercent = Math.max(
    Math.min((currentValue / target) * 100, 100),
    0,
  );
  const isMobile = useViewportStore((state) => state.isMobile);

  const checkBlockedDateFn = useCallback(
    (date: Date) => isBefore(startOfDay(date), startOfDay(startDate)),
    [startDate],
  );

  const { icon, message, progressStatus } = getProgressIconAndMessage(
    getProgressStatus({
      currentValue,
      initialValue,
      target,
      startDate,
      targetDate,
    }),
    t,
  );

  const daysRemaining = differenceInCalendarDays(
    new Date(targetDate),
    new Date(),
  );
  const timeLeftLabel =
    progressStatus === 'complete'
      ? null
      : daysRemaining >= 0
        ? plural(daysRemaining, {
            one: '# day left',
            other: '# days left',
          })
        : t`Past due`;

  return (
    <Card
      size="sm"
      className="w-full max-w-[600px] rounded-2xl pb-6 text-center shadow-xs"
      data-testid={`goal-card-${id}`}
    >
      <CardHeader>
        <CardTitle className="w-full text-center text-xl font-medium sm:text-2xl">
          <Link
            to="/goals/$id"
            params={{ id }}
            mask={{
              to: '/goals/$id',
              params: { id: shortId },
            }}
            aria-label={t`Toggle goal details`}
            className={cn(
              buttonVariants({
                variant: 'ghost',
                size: 'lg',
              }),
              'relative flex w-full items-center text-xl font-medium sm:text-2xl',
            )}
          >
            <span className="flex-1 text-center">{title}</span>
            {isMobile ? (
              <ChevronUpIcon className="absolute right-2" />
            ) : (
              <ChevronRightIcon className="absolute right-2" />
            )}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <CalendarHeatmap
          goalId={id}
          checkBlockedDateFn={checkBlockedDateFn}
          blockedDateFeedback={t`Before goal's start date`}
          className="-mx-2 sm:mx-0"
        />
        {/* biome-ignore lint/a11y/noStaticElementInteractions: touch-only hold-to-reveal of decorative labels; values stay exposed via aria-valuetext */}
        <div
          className="group/progress flex flex-col gap-1.5 select-none"
          onPointerDown={startHoldReveal}
          onPointerUp={endHoldReveal}
          onPointerCancel={endHoldReveal}
          onPointerLeave={endHoldReveal}
          onContextMenu={(event) => {
            if (isRevealed) event.preventDefault();
          }}
        >
          <div className="flex items-center justify-between gap-2 px-0.5 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span aria-hidden className="font-noto-emoji text-lg">
                {icon}
              </span>
              <span
                className={cn(
                  'opacity-0 transition-opacity group-hover/progress:opacity-100',
                  isRevealed && 'opacity-100',
                )}
              >
                {message}
              </span>
            </span>
            {timeLeftLabel && (
              <span
                className={cn(
                  'text-muted-foreground text-xs opacity-0 transition-opacity group-hover/progress:opacity-100',
                  isRevealed && 'opacity-100',
                )}
              >
                {timeLeftLabel}
              </span>
            )}
          </div>
          <ProgressBar
            progressPercent={progressPercent}
            target={target}
            currentValue={currentValue}
            isRevealed={isRevealed}
          />
        </div>
      </CardContent>
    </Card>
  );
}
