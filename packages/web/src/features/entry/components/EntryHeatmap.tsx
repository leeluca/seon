import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLingui } from '@lingui/react/macro';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday as checkIsToday,
  startOfDay,
  startOfWeek,
} from 'date-fns';

import { ENTRIES } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import {
  getDailyGains,
  getHeatmapLevel,
  toDayKey,
} from '~/data/domain/goalMetrics';
import type { GoalType } from '~/features/goal/model';
import { ResponsivePopover } from '~/shared/components/ui/responsive-popover';
import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';
import CreateEntryForm from './CreateEntryForm';

const LEVEL_CLASSES = [
  'bg-muted',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/70',
  'bg-primary',
] as const;

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Contribution-style calendar of the goal's lifetime: weeks as columns,
 * scrolled to the present, scrollable back to the start. Cells shade
 * activity only — a missed day stays neutral, never a warning color.
 * Tapping a day opens the entry form to add, correct, or delete it.
 */
export function EntryHeatmap({
  goal,
  className,
}: {
  goal: Database['goal'];
  className?: string;
}) {
  const { t } = useLingui();
  const isMobile = useViewportStore((state) => state.isMobile);
  const { data: entries = [] } = useQuery(ENTRIES.goalId(goal.id));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [anchor, setAnchor] = useState<Element | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [hovered, setHovered] = useState<{
    day: Date;
    x: number;
    y: number;
  } | null>(null);

  const { weeks, monthLabels, gains, entriesByDay, perDay, today, start } =
    useMemo(() => {
      const today = startOfDay(new Date());
      const start = startOfDay(new Date(goal.startDate));
      const gridStart = startOfWeek(start < today ? start : today, {
        weekStartsOn: 0,
      });
      const gridEnd = endOfWeek(today, { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

      const weeks: Date[][] = [];
      for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }

      const monthLabels = weeks.map((week, index) => {
        const label = format(week[0], 'MMM');
        const previous = weeks[index - 1];
        return !previous || format(previous[0], 'MMM') !== label ? label : '';
      });

      const totalDays = Math.max(
        differenceInCalendarDays(startOfDay(new Date(goal.targetDate)), start) +
          1,
        1,
      );

      return {
        weeks,
        monthLabels,
        gains: getDailyGains(entries, goal),
        entriesByDay: new Map(
          entries.map((entry) => [new Date(entry.date).toDateString(), entry]),
        ),
        perDay: (goal.target - goal.initialValue) / totalDays,
        today,
        start,
      };
    }, [entries, goal]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const selectedEntry = selectedDay
    ? entriesByDay.get(selectedDay.toDateString())
    : undefined;

  const hoveredGain = hovered ? (gains.get(toDayKey(hovered.day)) ?? 0) : 0;
  const hoveredEntry = hovered
    ? entriesByDay.get(hovered.day.toDateString())
    : undefined;
  let hoveredValueLabel = t`No entry`;
  if (goal.type === 'BOOLEAN') {
    if (hoveredGain > 0) hoveredValueLabel = t`Done`;
  } else if (hoveredGain > 0 || hoveredEntry) {
    hoveredValueLabel = `+${hoveredGain} ${goal.unit}`;
  }

  return (
    <section className={className} aria-label={t`Entry calendar`}>
      <div className="flex gap-1.5">
        <div className="flex shrink-0 flex-col gap-1">
          <span className="h-3" aria-hidden="true" />
          {WEEKDAY_LABELS.map((label, index) => (
            <span
              key={`${label}-${
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed weekday positions
                index
              }`}
              className="text-muted-foreground flex size-6 items-center justify-center text-[10px]"
              aria-hidden="true"
            >
              {label}
            </span>
          ))}
        </div>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: handlers only dismiss the decorative hover tooltip */}
        <div
          ref={scrollRef}
          className="overflow-x-auto pb-1"
          onMouseLeave={() => setHovered(null)}
          onScroll={() => setHovered(null)}
        >
          <div className="w-max">
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div
                  key={week[0].toISOString()}
                  className="flex flex-col gap-1"
                >
                  <span
                    className="text-muted-foreground h-3 text-[10px] leading-3 whitespace-nowrap"
                    aria-hidden="true"
                  >
                    {monthLabels[weekIndex]}
                  </span>
                  {week.map((day) => {
                    const isOutside = day < start || day > today;
                    if (isOutside) {
                      return (
                        <span
                          key={day.toISOString()}
                          className="size-6"
                          aria-hidden="true"
                        />
                      );
                    }

                    const entry = entriesByDay.get(day.toDateString());
                    let level = getHeatmapLevel(
                      gains.get(toDayKey(day)) ?? 0,
                      perDay,
                    );
                    if (level === 0 && entry && entry.value !== 0) level = 1;

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        data-heatmap-day
                        aria-label={t`Add entry for ${format(day, 'MMM d')}`}
                        className={cn(
                          'hover:ring-ring/50 size-6 rounded-[5px] transition-shadow hover:ring-2 hover:ring-inset',
                          LEVEL_CLASSES[level],
                          checkIsToday(day) &&
                            'ring-primary/50 ring-2 ring-inset',
                          selectedDay &&
                            isSameDay(day, selectedDay) &&
                            isPopoverOpen &&
                            'ring-ring ring-2 ring-inset',
                        )}
                        onClick={(event) => {
                          setHovered(null);
                          setSelectedDay(day);
                          setAnchor(event.currentTarget);
                          setIsPopoverOpen(true);
                        }}
                        onMouseEnter={(event) => {
                          if (isMobile) return;
                          const rect =
                            event.currentTarget.getBoundingClientRect();
                          setHovered({
                            day,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div
              className="text-muted-foreground mt-2 flex items-center justify-end gap-1 text-[10px]"
              aria-hidden="true"
            >
              <Trans>Less</Trans>
              {LEVEL_CLASSES.map((levelClass) => (
                <span
                  key={levelClass}
                  className={cn('size-2.5 rounded-[3px]', levelClass)}
                />
              ))}
              <Trans>More</Trans>
            </div>
          </div>
        </div>
      </div>

      <ResponsivePopover
        open={isPopoverOpen}
        onOpenChange={(nextOpen, eventDetails) => {
          if (!nextOpen && eventDetails?.reason === 'outside-press') {
            const target = eventDetails.event.target;
            if (
              target instanceof Element &&
              target.closest('[data-heatmap-day]')
            ) {
              eventDetails.cancel();
              return;
            }
          }
          setIsPopoverOpen(nextOpen);
        }}
        virtualRef={anchor}
        trigger={null}
        contentClassName={isMobile ? '' : 'w-fit max-w-72'}
        overlayClassName={isMobile ? 'bg-black/50' : ''}
        drawerTitle={
          <span>
            <Trans>
              Add entry for{' '}
              {selectedDay ? format(selectedDay, 'EEE, MMM d') : ''}
            </Trans>{' '}
            <span className="text-muted-foreground block text-sm font-normal">
              {goal.title}
            </span>
          </span>
        }
      >
        {selectedDay && (
          <CreateEntryForm
            key={selectedDay.getTime()}
            goalId={goal.id}
            entryId={selectedEntry?.id}
            date={selectedDay}
            value={selectedEntry?.value}
            orderedEntries={entries}
            goalType={goal.type as GoalType}
            onSubmitCallback={() => setIsPopoverOpen(false)}
          />
        )}
      </ResponsivePopover>

      {hovered &&
        !isMobile &&
        createPortal(
          <div
            className="bg-foreground text-background pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md px-2 py-1 text-xs whitespace-nowrap"
            style={{ left: hovered.x, top: hovered.y - 6 }}
            aria-hidden="true"
          >
            <span className="font-medium">
              {format(hovered.day, 'EEE, MMM d')}
            </span>
            <span className="opacity-70"> · {hoveredValueLabel}</span>
          </div>,
          document.body,
        )}
    </section>
  );
}
