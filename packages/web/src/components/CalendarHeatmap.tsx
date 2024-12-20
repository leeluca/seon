import React, { useMemo, useRef, useState } from 'react';
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

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const popoverAnchorRef = useRef<HTMLElement | null>(null);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex w-full content-center justify-center">
        <p className="text-sm">
          {startMonth === endMonth ? startMonth : `${startMonth} • ${endMonth}`}
        </p>
      </div>

      <div className="mb-2 grid w-full max-w-[440px] auto-cols-fr grid-flow-col items-end justify-items-center gap-2">
        <Button variant="secondary" size="icon-sm" onClick={handlePrevWeek}>
          <ArrowBigLeftIcon size={18} />
        </Button>
        {days.map((day) => {
          const stringDate = day.toDateString();
          const dayEntry = entriesMap.get(stringDate);

          return (
            <div key={stringDate} className="flex flex-col">
              <p className="mb-1 text-xs font-light">{format(day, 'EEEEE')}</p>
              <Button
                variant={dayEntry ? null : 'outline'}
                className={cn('min-w-0 rounded', {
                  'border-input border bg-green-500 text-white hover:bg-green-500/90':
                    dayEntry,
                })}
                size="sm"
                onClick={(e) => {
                  popoverAnchorRef.current = e.currentTarget;
                  setSelectedDate(day);
                  setPopoverOpen(true);
                }}
              >
                <div className="text-center text-xs">{format(day, 'd')}</div>
              </Button>
            </div>
          );
        })}
        <Button variant="secondary" size="icon-sm" onClick={handleNextWeek}>
          <ArrowBigRightIcon size={16} />
        </Button>
      </div>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverAnchor virtualRef={popoverAnchorRef} />
        <PopoverContent>
          <NewEntryForm
            id={goalId}
            date={selectedDate}
            onSubmitCallback={() => setPopoverOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CalendarHeatmap;
