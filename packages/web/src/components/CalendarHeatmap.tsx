import React, { useMemo, useState } from 'react';
import { useQuery } from '@powersync/react';
import {
  addDays,
  addWeeks,
  format,
  set,
  startOfWeek,
  subWeeks,
} from 'date-fns';

import db from '~/lib/database';
import { cn } from '~/utils';
import { NewEntryPopover } from './NewEntryPopover';
import { PopoverAnchor } from './ui/popover';

interface CalendarHeatmapProps {
  goalId: string;
  onClick?: (date: Date) => void;
}

const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  goalId,
  onClick,
}) => {
  const { data: entries } = useQuery(
    db.selectFrom('entry').selectAll().where('goalId', '=', goalId),
  );
  const [entryPopoverOpen, setEntryPopoverOpen] = useState(false);

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
  const startMonth = format(days[0], 'MMMM');
  const endMonth = format(days[days.length - 1], 'MMMM');
  console.log({ entryPopoverOpen });
  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 flex w-full content-center justify-between">
        <button
          onClick={handlePrevWeek}
          className="mr-2 rounded bg-gray-200 px-2 py-1"
        >
          이전 주
        </button>
        <p className="text-sm font-medium">
          {startMonth === endMonth ? startMonth : `${startMonth} • ${endMonth}`}
          {/* {startMonth}/{endMonth} */}
        </p>
        <button
          onClick={handleNextWeek}
          className="rounded bg-gray-200 px-2 py-1"
        >
          다음 주
        </button>
      </div>
      <div className="flex">
        {days.map((day) => {
          const stringDate = day.toDateString();
          const dayEntry = entriesMap.get(stringDate);

          return (
            <div
              key={stringDate}
              className={cn(
                'm-1 h-10 w-10 cursor-pointer rounded bg-gray-100',
                { 'bg-green-400 text-white': dayEntry },
              )}
              onClick={() => setEntryPopoverOpen((prev) => !prev)}
            >
              <div className="text-center text-xs">{format(day, 'd')}</div>
            </div>
          );
        })}
        <NewEntryPopover
          id={goalId}
          isOpen={entryPopoverOpen}
          toggle={() => setEntryPopoverOpen((prev) => !prev)}
        />
      </div>
    </div>
  );
};

export default CalendarHeatmap;
