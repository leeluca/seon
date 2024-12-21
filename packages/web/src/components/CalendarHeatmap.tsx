import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@powersync/react';
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { ArrowBigLeftIcon, ArrowBigRightIcon } from 'lucide-react';

import db from '~/lib/database';
import { cn } from '~/utils';
import NewEntryForm from './NewEntryForm';
import { Button } from './ui/button';
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover';

interface CalendarHeatmapProps {
  goalId: string;
}

const CalendarHeatmap = ({ goalId }: CalendarHeatmapProps) => {
  const { data: entries } = useQuery(
    db.selectFrom('entry').selectAll().where('goalId', '=', goalId),
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

  const days = Array.from({ length: 7 }).map((_, index) =>
    addDays(currentWeekStart, index),
  );
  const startMonth = format(days[0], 'MMM');
  const endMonth = format(days[days.length - 1], 'MMM');

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedDateValue, setSelectedDateValue] = useState<
    [Date | null, number]
  >([new Date(), 0]);
  const popoverAnchorRef = useRef<HTMLElement | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!isPopoverOpen && selectedDateValue[0]) {
      timeoutRef.current = setTimeout(
        () => setSelectedDateValue([null, 0]),
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
    <div className="flex flex-col items-center">
      <div className="mb-2 ml-2 flex w-full content-center justify-start">
        <p className="text-xs font-medium">
          {startMonth === endMonth
            ? format(days[0], 'MMMM')
            : `${startMonth} • ${endMonth}`}
        </p>
      </div>
      <div className="mb-2 grid w-full auto-cols-fr grid-flow-col items-end justify-items-stretch gap-2">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={handlePrevWeek}
          className="mb-1 justify-self-center"
        >
          <ArrowBigLeftIcon size={18} />
        </Button>
        {days.map((day) => {
          const stringDate = day.toDateString();
          const savedEntry = entriesMap.get(stringDate);
          const isSelected = selectedDateValue[0]?.getTime() === day.getTime();
          return (
            <div key={stringDate} className="flex flex-col">
              <p className="mb-2 text-xs font-light">{format(day, 'EEEEE')}</p>
              <Button
                variant={savedEntry ? null : 'outline'}
                className={cn('aspect-square w-full min-w-0 rounded', {
                  'border-input border bg-emerald-500 text-white hover:bg-emerald-500/80':
                    savedEntry,
                  'bg-emerald-500/80': savedEntry && isSelected,
                  'bg-accent text-accent-foreground': !savedEntry && isSelected,
                })}
                // size="sm"
                onClick={(e) => {
                  popoverAnchorRef.current = e.currentTarget;
                  setSelectedDateValue(() => [day, savedEntry?.value ?? 0]);
                  setIsPopoverOpen(true);
                }}
              >
                <div className="text-center text-xs">{format(day, 'd')}</div>
              </Button>
            </div>
          );
        })}
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={handleNextWeek}
          className="mb-1 justify-self-center"
        >
          <ArrowBigRightIcon size={18} />
        </Button>
      </div>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverAnchor virtualRef={popoverAnchorRef} />
        <PopoverContent className="w-64">
          <NewEntryForm
            id={goalId}
            date={selectedDateValue[0] || undefined}
            value={selectedDateValue[1]}
            onSubmitCallback={() => setIsPopoverOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CalendarHeatmap;
