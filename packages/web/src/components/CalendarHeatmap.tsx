import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import {
  addDays,
  addWeeks,
  isPast as checkIsPast,
  isSameWeek as checkIsSameWeek,
  isToday as checkIsToday,
  format,
  isAfter,
  isSameDay,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { ArrowBigLeftIcon, ArrowBigRightIcon } from 'lucide-react';

import { ENTRIES, GOALS } from '~/constants/query';
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/types/goal';
import { cn } from '~/utils';
import { NewEntryForm } from './entryForm/';
import { Button } from './ui/button';
import { ResponsivePopover } from './ui/responsive-popover';
import { ResponsiveTooltip } from './ui/responsive-tooltip';

interface GetButtonStylesArgs {
  entryValue: number | undefined;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
  isBlocked: boolean;
  isAfterCompletion: boolean;
}
const getButtonStyles = ({
  entryValue,
  isSelected,
  isToday,
  isPast,
  isBlocked,
  isAfterCompletion,
}: GetButtonStylesArgs) => {
  const hasValue = entryValue !== undefined && entryValue > 0;
  const isEmpty = !entryValue;

  const isEmptyPastDay = isPast && isEmpty && !isAfterCompletion;
  const isNeutralDay = isEmpty && !isEmptyPastDay;

  const baseStyles = isNeutralDay
    ? 'border border-input aspect-square h-auto w-full min-w-0 rounded xs:h-9 hover:bg-accent hover:text-accent-foreground relative transition-colors duration-300 ease-out motion-reduce:transition-none'
    : 'hover:text-white text-white aspect-square h-auto w-full min-w-0 rounded xs:h-9 relative transition-colors duration-300 ease-out motion-reduce:transition-none';

  return cn(baseStyles, {
    // Success states
    'bg-primary/90 hover:bg-primary/80': hasValue,
    'bg-primary/60': hasValue && isSelected,

    // Skipped states
    'bg-orange-300/90 hover:bg-orange-300/80': isEmptyPastDay,
    'bg-orange-300/60': isEmptyPastDay && isSelected,

    // Neutral states
    'bg-accent text-accent-foreground': isNeutralDay && isSelected,
    'border-2 border-cyan-500/30': isToday,
    'bg-gray-300 cursor-not-allowed border-none hover:bg-gray-300': isBlocked,
  });
};

const CompletionBadge = () => (
  <div className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-white ring-2 ring-white">
    ✓
  </div>
);

interface CalendarHeatmapProps {
  goalId: string;
  checkBlockedDateFn?: (date: Date) => boolean;
  blockedDateFeedback?: string;
  className?: string;
}

const CalendarHeatmap = ({
  goalId,
  checkBlockedDateFn,
  blockedDateFeedback,
  className,
}: CalendarHeatmapProps) => {
  const { data: goal } = useQuery(GOALS.detail(goalId));
  const { data: entries = [] } = useQuery(ENTRIES.goalId(goalId));

  const entriesMap = useMemo(
    () =>
      new Map(
        entries.map((entry) => [new Date(entry.date).toDateString(), entry]),
      ),
    [entries],
  );

  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };
  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goBackToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const days = Array.from({ length: 7 }).map((_, index) =>
    addDays(currentWeekStart, index),
  );
  const startMonth = format(days[0], 'MMM');
  const endMonth = format(days[days.length - 1], 'MMM');
  const isSameWeek = checkIsSameWeek(new Date(), currentWeekStart);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedDateValue, setSelectedDateValue] = useState<[Date?, number?]>([
    new Date(),
    undefined,
  ]);
  const popoverAnchorRef = useRef<Element | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useViewportStore((state) => state.isMobile);
  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!isPopoverOpen && selectedDateValue[0]) {
      timeoutRef.current = setTimeout(
        () => setSelectedDateValue([undefined, undefined]),
        150,
      );
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPopoverOpen, selectedDateValue]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="mb-2 flex w-full items-center justify-between">
        <p className="ml-2 text-xs font-medium">
          {startMonth === endMonth
            ? format(days[0], 'MMMM')
            : `${startMonth} • ${endMonth}`}
        </p>
        <Button
          variant="outline"
          className={isSameWeek ? 'invisible' : ''}
          size="sm"
          onClick={goBackToCurrentWeek}
        >
          <Trans>Today</Trans>
        </Button>
      </div>
      <div className="mb-2 grid w-full auto-cols-fr grid-flow-col items-center justify-items-stretch gap-[2px] sm:items-end sm:gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handlePrevWeek}
          className="mt-7 mb-1 aspect-square h-auto w-auto min-w-0 justify-self-center p-2 sm:mt-0 sm:h-7 sm:w-7 sm:p-0"
        >
          <ArrowBigLeftIcon size={18} />
        </Button>
        {days.map((day) => {
          const stringDate = day.toDateString();
          const savedEntry = entriesMap.get(stringDate);
          const entryValue = savedEntry?.value;
          const isSelected = selectedDateValue[0]?.getTime() === day.getTime();
          const isBlocked = checkBlockedDateFn?.(day) ?? false;
          const isToday = checkIsToday(day);
          const isPast = !isToday && checkIsPast(day);
          const isCompletionDay =
            !!goal?.completionDate &&
            isSameDay(day, new Date(goal.completionDate));
          const showTooltip =
            (!!entryValue && !isTouchScreen) ||
            (isBlocked && !!blockedDateFeedback);

          return (
            <div
              key={stringDate}
              className="flex flex-col"
              ref={(el) => {
                if (day.getTime() === selectedDateValue[0]?.getTime()) {
                  popoverAnchorRef.current = el;
                }
              }}
            >
              <p className="mb-2 text-xs font-light">{format(day, 'EEEEE')}</p>

              {showTooltip ? (
                <ResponsiveTooltip
                  content={
                    isBlocked && blockedDateFeedback ? (
                      <p>{blockedDateFeedback}</p>
                    ) : (
                      <p>{entryValue}</p>
                    )
                  }
                  side="top"
                >
                  <Button
                    variant={savedEntry ? null : 'outline'}
                    className={getButtonStyles({
                      entryValue,
                      isSelected,
                      isToday,
                      isPast: goal !== undefined && isPast && !isBlocked,
                      isBlocked,
                      isAfterCompletion:
                        goal !== undefined &&
                        !!goal?.completionDate &&
                        isAfter(day, new Date(goal?.completionDate)),
                    })}
                    disabled={isBlocked}
                    aria-label={t`Add entry for ${format(day, 'do')}`}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => {
                      setSelectedDateValue(() => [day, entryValue]);
                      setIsPopoverOpen(true);
                    }}
                  >
                    <div className="text-center text-xs">
                      {format(day, 'd')}
                    </div>
                    {isCompletionDay && <CompletionBadge />}
                  </Button>
                </ResponsiveTooltip>
              ) : (
                <Button
                  variant={savedEntry ? null : 'outline'}
                  className={getButtonStyles({
                    entryValue,
                    isSelected,
                    isToday,
                    isPast: goal !== undefined && isPast && !isBlocked,
                    isBlocked,
                    isAfterCompletion:
                      goal !== undefined &&
                      !!goal?.completionDate &&
                      isAfter(day, new Date(goal?.completionDate)),
                  })}
                  disabled={isBlocked}
                  aria-label={t`Add entry for ${format(day, 'do')}`}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => {
                    setSelectedDateValue(() => [day, entryValue]);
                    setIsPopoverOpen(true);
                  }}
                >
                  <div className="text-center text-xs">{format(day, 'd')}</div>
                  {isCompletionDay && <CompletionBadge />}
                </Button>
              )}
            </div>
          );
        })}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleNextWeek}
          className="mt-7 mb-1 aspect-square h-auto w-auto min-w-0 justify-self-center p-2 sm:mt-0 sm:h-7 sm:w-7 sm:p-0"
        >
          <ArrowBigRightIcon size={18} />
        </Button>
      </div>
      <ResponsivePopover
        open={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
        virtualRef={popoverAnchorRef}
        trigger={null}
        contentClassName={isMobile ? '' : 'w-fit max-w-72'}
        overlayClassName={isMobile ? 'bg-black/50' : ''}
        drawerTitle={
          <span>
            <Trans>
              Add entry for <span className="text-gray-500">{goal?.title}</span>
            </Trans>
          </span>
        }
      >
        <NewEntryForm
          goalId={goalId}
          entryId={
            selectedDateValue[0] &&
            entriesMap.get(selectedDateValue[0].toDateString())?.id
          }
          date={selectedDateValue[0]}
          value={selectedDateValue[1]}
          orderedEntries={entries}
          goalType={goal?.type as GoalType}
          onSubmitCallback={() => setIsPopoverOpen(false)}
        />
      </ResponsivePopover>
    </div>
  );
};

export default memo(CalendarHeatmap);
