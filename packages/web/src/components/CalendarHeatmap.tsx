import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@powersync/tanstack-react-query';
import {
  addDays,
  addWeeks,
  isPast as checkIsPast,
  isSameWeek as checkIsSameWeek,
  isToday as checkIsToday,
  format,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { ArrowBigLeftIcon, ArrowBigRightIcon } from 'lucide-react';

import { ENTRIES, GOALS } from '~/constants/query';
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/types/goal';
import { cn } from '~/utils';
import NewEntryForm from './NewEntryForm';
import { Button } from './ui/button';
import { ResponsivePopover } from './ui/responsive-popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface GetButtonStylesArgs {
  entryValue: number | undefined;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
  isBlocked: boolean;
}
const getButtonStyles = ({
  entryValue,
  isSelected,
  isToday,
  isPast,
  isBlocked,
}: GetButtonStylesArgs) => {
  const entryValueZero = (isPast && !entryValue) || entryValue === 0;
  const entryUndefined = entryValue === undefined && !isPast;
  const baseStyles = entryUndefined
    ? 'border border-input aspect-square h-auto w-full min-w-0 rounded sm:h-9 hover:bg-accent hover:text-accent-foreground'
    : 'hover:text-white text-white aspect-square h-auto w-full min-w-0 rounded sm:h-9';

  return cn(baseStyles, {
    'bg-emerald-500 hover:bg-emerald-500/80': entryValue && entryValue > 0,
    'bg-emerald-500/70': entryValue && entryValue > 0 && isSelected,
    'bg-orange-300 hover:bg-orange-300/80': entryValueZero,
    'bg-orange-300/70': entryValueZero && isSelected,
    'bg-accent text-accent-foreground': entryUndefined && isSelected,
    'border-2 border-blue-200': isToday,
    'bg-gray-300 cursor-not-allowed border-none hover:bg-gray-300': isBlocked,
  });
};
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
  const [selectedDateValue, setSelectedDateValue] = useState<
    [Date | undefined, number]
  >([new Date(), 0]);
  const popoverAnchorRef = useRef<HTMLElement | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const isMobile = useViewportStore((state) => state.isMobile);
  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!isPopoverOpen && selectedDateValue[0]) {
      timeoutRef.current = setTimeout(
        () => setSelectedDateValue([undefined, 0]),
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
          variant="secondary"
          size="icon-sm"
          onClick={handlePrevWeek}
          className="mb-1 mt-7 aspect-square h-auto w-auto min-w-0 justify-self-center p-2 sm:mt-0 sm:h-7 sm:w-7 sm:p-0"
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

          return (
            <div key={stringDate} className="flex flex-col">
              <p className="mb-2 text-xs font-light">{format(day, 'EEEEE')}</p>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  className="disabled:pointer-events-auto"
                >
                  <Button
                    variant={savedEntry ? null : 'outline'}
                    className={getButtonStyles({
                      entryValue,
                      isSelected,
                      isToday,
                      isPast: isPast && !isBlocked,
                      isBlocked,
                    })}
                    disabled={isBlocked}
                    aria-label={`Add entry for ${format(day, 'd')}`}
                    onClick={(e) => {
                      popoverAnchorRef.current = e.currentTarget;
                      setSelectedDateValue(() => [day, entryValue ?? 0]);
                      setIsPopoverOpen(true);
                    }}
                  >
                    <div className="text-center text-xs">
                      {format(day, 'd')}
                    </div>
                  </Button>
                </TooltipTrigger>
                {!!entryValue && !isTouchScreen && (
                  <TooltipContent
                    onPointerDownOutside={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <p>{entryValue}</p>
                  </TooltipContent>
                )}
                {isBlocked && blockedDateFeedback && (
                  <TooltipContent>
                    <p>{blockedDateFeedback}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          );
        })}
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={handleNextWeek}
          className="mb-1 mt-7 aspect-square h-auto w-auto min-w-0 justify-self-center p-2 sm:mt-0 sm:h-7 sm:w-7 sm:p-0"
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
          className={isMobile ? 'px-6 pt-4' : ''}
        />
      </ResponsivePopover>
    </div>
  );
};

export default CalendarHeatmap;
