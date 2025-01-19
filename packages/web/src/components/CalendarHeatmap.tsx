import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@powersync/react';
import {
  addDays,
  addWeeks,
  isSameWeek as checkIsSameWeek,
  isToday as checkIsToday,
  format,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { ArrowBigLeftIcon, ArrowBigRightIcon } from 'lucide-react';

import db from '~/lib/database';
import { cn } from '~/utils';
import NewEntryForm from './NewEntryForm';
import { Button } from './ui/button';
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

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
  const {
    data: [goal],
  } = useQuery(
    db.selectFrom('goal').select('type').where('id', '=', goalId).limit(1),
  );

  const { data: entries } = useQuery(
    db
      .selectFrom('entry')
      .selectAll()
      .where('goalId', '=', goalId)
      .orderBy('date', 'asc'),
  );

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
          const isSelected = selectedDateValue[0]?.getTime() === day.getTime();
          const isBlocked = checkBlockedDateFn?.(day);
          const isToday = checkIsToday(day);
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
                    className={cn(
                      'aspect-square h-auto w-full min-w-0 rounded sm:h-9',
                      {
                        'border-input border bg-emerald-500 text-white hover:bg-emerald-500/80':
                          savedEntry,
                        'bg-emerald-500/80': savedEntry && isSelected,
                        'bg-accent text-accent-foreground':
                          !savedEntry && isSelected,
                        'cursor-not-allowed': isBlocked,
                        'border-2 border-blue-200': isToday,
                      },
                    )}
                    disabled={isBlocked}
                    aria-label={`Add entry for ${format(day, 'd')}`}
                    onClick={(e) => {
                      popoverAnchorRef.current = e.currentTarget;
                      setSelectedDateValue(() => [day, savedEntry?.value ?? 0]);
                      setIsPopoverOpen(true);
                    }}
                  >
                    <div className="text-center text-xs">
                      {format(day, 'd')}
                    </div>
                  </Button>
                </TooltipTrigger>
                {savedEntry && (
                  <TooltipContent
                    onPointerDownOutside={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <p>{savedEntry.value}</p>
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
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverAnchor virtualRef={popoverAnchorRef} />
        <PopoverContent className="w-fit max-w-72">
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
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CalendarHeatmap;
