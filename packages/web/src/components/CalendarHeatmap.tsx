import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
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
import { CreateEntryForm } from './entryForm';
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
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerStartXRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const hasActivePointerRef = useRef(false);
  const isDraggingRef = useRef(false);
  const shouldBlockClickRef = useRef(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

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

  useEffect(() => {
    const node = sliderContainerRef.current;
    if (!node || typeof window === 'undefined') {
      return;
    }

    const updateWidth = () => {
      setSliderWidth(node.offsetWidth);
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setSliderWidth(entries[0].contentRect.width);
        }
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const getSliderWidth = () => {
    if (sliderWidth) {
      return sliderWidth;
    }
    const node = sliderContainerRef.current;
    return node ? node.offsetWidth : 0;
  };

  const clampOffset = (value: number) => {
    const width = getSliderWidth();
    if (!width) {
      return 0;
    }
    const limit = width;
    return Math.max(Math.min(value, limit), -limit);
  };
  // TODO: change to use animation library
  const finalizeDrag = (shouldSnap: boolean) => {
    const container = sliderContainerRef.current;
    const pointerId = pointerIdRef.current;
    const wasDragging = isDraggingRef.current;

    if (pointerId !== null && container?.hasPointerCapture?.(pointerId)) {
      container.releasePointerCapture(pointerId);
    }

    if (shouldSnap && wasDragging) {
      const width = getSliderWidth();
      const offset = dragOffsetRef.current;

      if (width) {
        const threshold = width * 0.2; // 20% threshold to snap
        let weeksDelta = 0;

        if (Math.abs(offset) > threshold) {
          weeksDelta = offset < 0 ? 1 : -1; // -offset means swipe left -> next week (1)
        }

        if (weeksDelta !== 0) {
          // 1. Keep transitions disabled to prevent animation
          setIsDraggingSlider(true);

          // 2. Instantly change the week
          setCurrentWeekStart((prev) => addWeeks(prev, weeksDelta));

          // 3. Instantly reset the drag offset for the new week
          setDragOffset(0);

          // 4. Reset all pointer-tracking refs
          pointerIdRef.current = null;
          pointerStartXRef.current = 0;
          dragOffsetRef.current = 0;
          hasActivePointerRef.current = false;
          isDraggingRef.current = false;

          // 5. Use setTimeout to re-enable transitions *after* this render cycle, to ensure the new week appears at offset 0 with no jump.
          setTimeout(() => {
            setIsDraggingSlider(false);
            shouldBlockClickRef.current = false;
          }, 0);

          return;
        }
      }
    }

    // snap back to center
    // This code now only runs if weeksDelta was 0 or if it wasn't a drag.

    // 1. Reset all pointer-tracking refs
    pointerIdRef.current = null;
    pointerStartXRef.current = 0;
    dragOffsetRef.current = 0;
    hasActivePointerRef.current = false;
    isDraggingRef.current = false;

    if (!wasDragging) {
      shouldBlockClickRef.current = false;
    }

    // 2. Animate the offset back to 0
    setDragOffset(0);

    if (wasDragging) {
      // 3. Re-enable transitions so the snap-back animation runs
      setIsDraggingSlider(false);
      setTimeout(() => {
        shouldBlockClickRef.current = false;
      }, 0);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const width = getSliderWidth();
    if (!width) {
      const node = sliderContainerRef.current;
      if (node) {
        setSliderWidth(node.offsetWidth);
      }
    }

    pointerIdRef.current = event.pointerId;
    pointerStartXRef.current = event.clientX;
    dragOffsetRef.current = 0;
    hasActivePointerRef.current = true;
    shouldBlockClickRef.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !hasActivePointerRef.current ||
      pointerIdRef.current === null ||
      pointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const delta = event.clientX - pointerStartXRef.current;

    if (!isDraggingRef.current) {
      const DRAG_ACTIVATION_THRESHOLD = 10;
      if (Math.abs(delta) < DRAG_ACTIVATION_THRESHOLD) {
        return;
      }
      isDraggingRef.current = true;
      shouldBlockClickRef.current = true;
      setIsDraggingSlider(true);
      const container = sliderContainerRef.current;
      if (container && pointerIdRef.current !== null) {
        container.setPointerCapture?.(pointerIdRef.current);
      }
    }

    event.preventDefault();
    const clamped = clampOffset(delta);
    dragOffsetRef.current = clamped;
    setDragOffset(clamped);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasActivePointerRef.current) {
      return;
    }

    if (isDraggingRef.current) {
      event.preventDefault();
    }

    finalizeDrag(isDraggingRef.current);
  };

  const handlePointerCancel = () => {
    if (!hasActivePointerRef.current) {
      return;
    }
    finalizeDrag(false);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !hasActivePointerRef.current ||
      pointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    finalizeDrag(isDraggingRef.current);
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!shouldBlockClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    shouldBlockClickRef.current = false;
  };

  const weeksToRender = [-1, 0, 1];

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
      <div className="mb-2 flex w-full items-end gap-[2px] sm:gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handlePrevWeek}
          className="mb-[9px] aspect-square h-6 w-6 min-w-0 justify-self-center p-2 sm:mt-6 sm:mb-[5px] sm:h-7 sm:w-7 sm:p-0"
        >
          <ArrowBigLeftIcon size={18} />
        </Button>
        <div
          ref={sliderContainerRef}
          className={cn(
            'relative flex-1 touch-pan-y overflow-hidden px-[2px] sm:px-2',
            isDraggingSlider ? 'cursor-grabbing select-none' : 'cursor-grab',
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerLeave}
          onClickCapture={handleClickCapture}
        >
          {/* Left/right gradient overlays to indicate horizontal scrollability. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2 sm:w-3">
            <div className="h-full w-full bg-linear-to-r from-white/90 to-transparent dark:from-black/70" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-2 sm:w-3">
            <div className="h-full w-full bg-linear-to-l from-white/90 to-transparent dark:from-black/70" />
          </div>

          <div
            className="flex items-stretch"
            style={{
              // NOTE: 12px offsets week margins (4px each) + container padding to center current week
              transform: `translateX(calc(-100% - 12px + ${dragOffset}px))`,
              transition: isDraggingSlider
                ? 'none'
                : 'transform 200ms ease-out',
              willChange: 'transform',
            }}
          >
            {weeksToRender.map((weekOffset) => {
              const weekStart = addWeeks(currentWeekStart, weekOffset);
              const weekDays = Array.from({ length: 7 }).map((_, index) =>
                addDays(weekStart, index),
              );

              return (
                <div
                  key={`${weekStart.toISOString()}-${weekOffset}`}
                  className="mx-1 grid auto-rows-fr grid-cols-7 items-center justify-items-stretch gap-[2px] sm:items-end sm:gap-2"
                  style={{ flex: '0 0 100%' }}
                >
                  {weekDays.map((day) => {
                    const stringDate = day.toDateString();
                    const savedEntry = entriesMap.get(stringDate);
                    const entryValue = savedEntry?.value;
                    const isSelected =
                      selectedDateValue[0]?.getTime() === day.getTime();
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
                          if (
                            day.getTime() === selectedDateValue[0]?.getTime()
                          ) {
                            popoverAnchorRef.current = el;
                          }
                        }}
                      >
                        <p className="mb-2 text-xs font-light">
                          {format(day, 'EEEEE')}
                        </p>

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
                                isPast:
                                  goal !== undefined && isPast && !isBlocked,
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
                              isPast:
                                goal !== undefined && isPast && !isBlocked,
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
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleNextWeek}
          className="mb-[9px] aspect-square h-6 w-6 min-w-0 justify-self-center p-2 sm:mt-6 sm:mb-[5px] sm:h-7 sm:w-7 sm:p-0"
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
        <CreateEntryForm
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
