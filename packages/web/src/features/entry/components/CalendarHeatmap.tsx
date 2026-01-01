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
} from 'date-fns';
import { ArrowBigLeftIcon, ArrowBigRightIcon } from 'lucide-react';
import { animate, motion, useDragControls, useMotionValue } from 'motion/react';

import { ENTRIES, GOALS } from '~/constants/query';
import type { GoalType } from '~/features/goal/model';
import { Button } from '~/shared/components/ui/button';
import { ResponsivePopover } from '~/shared/components/ui/responsive-popover';
import { ResponsiveTooltip } from '~/shared/components/ui/responsive-tooltip';
import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';
import CreateEntryForm from './CreateEntryForm';

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
    ? 'border border-input aspect-square h-auto w-full min-w-0 rounded-xl xs:h-9 hover:bg-accent hover:text-accent-foreground relative transition-colors duration-300 ease-out motion-reduce:transition-none'
    : 'hover:text-white text-white aspect-square h-auto w-full min-w-0 rounded-xl xs:h-9 relative transition-colors duration-300 ease-out motion-reduce:transition-none';

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
    void animateWeekChange(-1);
  };
  const handleNextWeek = () => {
    void animateWeekChange(1);
  };

  const goBackToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
    const width = getSliderWidth();
    if (width) {
      trackX.set(-width);
    }
  };

  const days = Array.from({ length: 7 }).map((_, index) =>
    addDays(currentWeekStart, index),
  );
  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);
  const startMonth = capitalize(format(days[0], 'MMM'));
  const endMonth = capitalize(format(days[days.length - 1], 'MMM'));
  const isSameWeek = checkIsSameWeek(new Date(), currentWeekStart);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedDateValue, setSelectedDateValue] = useState<[Date?, number?]>([
    new Date(),
    undefined,
  ]);
  const popoverAnchorRef = useRef<Element | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();
  const trackX = useMotionValue(0);
  const shouldBlockClickRef = useRef(false);
  const isDraggingSliderRef = useRef(false);
  const isSnappingRef = useRef(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useViewportStore((state) => state.isMobile);
  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);

  useEffect(() => {
    isDraggingSliderRef.current = isDraggingSlider;
  }, [isDraggingSlider]);

  useEffect(() => {
    isSnappingRef.current = isSnapping;
  }, [isSnapping]);

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
      const width = node.offsetWidth;
      setSliderWidth(width);

      // Keep centered on the current week when resizing/layout changes.
      // Avoid interfering with an active drag or snap animation.
      if (!isDraggingSliderRef.current && !isSnappingRef.current) {
        trackX.set(-width);
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          const width = entries[0].contentRect.width;
          setSliderWidth(width);
          if (!isDraggingSliderRef.current && !isSnappingRef.current) {
            trackX.set(-width);
          }
        }
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, [trackX]);

  const getSliderWidth = () => {
    if (sliderWidth) {
      return sliderWidth;
    }
    const node = sliderContainerRef.current;
    return node ? node.offsetWidth : 0;
  };

  const TRANSITION_DURATION_MS = 300;

  const animateWeekChange = async (weeksDelta: number) => {
    // Prevent multiple animations at once or no change
    if (isSnapping || weeksDelta === 0) {
      return;
    }

    const width = getSliderWidth();
    if (!width) {
      setCurrentWeekStart((prev) => addWeeks(prev, weeksDelta));
      return;
    }

    setIsSnapping(true); // Lock input
    setIsDraggingSlider(false); // Ensure the track isn't stuck in a drag-only state

    // Track positions (px) for the 3-page strip:
    // prev: 0, current: -width, next: -2*width
    const snapTargetX = weeksDelta > 0 ? -2 * width : 0;

    const controls = animate(trackX, snapTargetX, {
      duration: TRANSITION_DURATION_MS / 1000,
      ease: 'easeOut',
    });
    await controls.finished;

    setCurrentWeekStart((prev) => addWeeks(prev, weeksDelta));
    trackX.set(-width);

    setIsSnapping(false);
    shouldBlockClickRef.current = false;
  };

  const handleSliderPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (isSnapping || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    const width = getSliderWidth();
    if (!width) {
      const node = sliderContainerRef.current;
      if (node) {
        setSliderWidth(node.offsetWidth);
      }
    }

    // Start a Motion-controlled drag. It won't be recognized until the pointer
    // moves at least `distanceThreshold` pixels.
    dragControls.start(event, { distanceThreshold: 10 });
  };

  const handleSliderDragEnd = async () => {
    const width = getSliderWidth();
    if (!width) {
      setIsDraggingSlider(false);
      shouldBlockClickRef.current = false;
      return;
    }

    const threshold = width * 0.2;
    const restX = -width;
    const offsetFromRest = trackX.get() - restX;

    let weeksDelta = 0;
    if (Math.abs(offsetFromRest) > threshold) {
      weeksDelta = offsetFromRest < 0 ? 1 : -1;
    }

    setIsDraggingSlider(false);

    if (weeksDelta !== 0) {
      await animateWeekChange(weeksDelta);
      return;
    }

    animate(trackX, restX, {
      duration: TRANSITION_DURATION_MS / 1000,
      ease: 'easeOut',
    });

    setTimeout(() => {
      shouldBlockClickRef.current = false;
    }, 0);
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
            ? capitalize(format(days[0], 'MMMM'))
            : `${startMonth} • ${endMonth}`}
        </p>
        <Button
          variant="outline"
          className={isSameWeek ? 'invisible' : 'mr-3'}
          disabled={isSameWeek}
          size="sm"
          onClick={goBackToCurrentWeek}
        >
          <Trans>Today</Trans>
        </Button>
      </div>
      <div className="relative mb-2 w-full px-3.5 sm:px-8">
        <div
          ref={sliderContainerRef}
          className={cn(
            'relative w-full touch-pan-y overflow-hidden',
            isDraggingSlider ? 'cursor-grabbing select-none' : 'cursor-grab',
          )}
          onPointerDown={handleSliderPointerDown}
          onClickCapture={handleClickCapture}
        >
          {/* NOTE: left/right gradient overlays to indicate horizontal scrollability. */}
          <div
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 z-10 w-4',
              isDraggingSlider ? '' : 'hidden',
            )}
          >
            <div className="h-full w-full bg-linear-to-r from-white/90 to-transparent dark:from-black/70" />
          </div>
          <div
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 z-10 w-4',
              isDraggingSlider ? '' : 'hidden',
            )}
          >
            <div className="h-full w-full bg-linear-to-l from-white/90 to-transparent dark:from-black/70" />
          </div>

          <motion.div
            className="flex items-stretch py-px"
            style={{ x: trackX, willChange: 'transform' }}
            drag={isSnapping ? false : 'x'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={
              sliderWidth
                ? { left: -2 * sliderWidth, right: 0 }
                : { left: 0, right: 0 }
            }
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => {
              setIsDraggingSlider(true);
              shouldBlockClickRef.current = true;
            }}
            onDragEnd={() => {
              void handleSliderDragEnd();
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
                  className="grid auto-rows-fr grid-cols-7 items-center justify-items-stretch gap-0.5 sm:items-end sm:gap-1"
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
                      ((!!entryValue && !isTouchScreen) ||
                        (isBlocked && !!blockedDateFeedback)) &&
                      (!isDraggingSlider || !isSnapping);

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
                        <p className="mb-2 text-xs font-light select-none">
                          {format(day, 'EEEEE')}
                        </p>

                        {showTooltip ? (
                          <ResponsiveTooltip
                            delayDuration={300}
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
          </motion.div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handlePrevWeek}
          // NOTE: 0.75rem = date label's 'mb-2 text-xs' height
          className="absolute top-[calc(50%+0.75rem)] left-0 z-10 aspect-square h-6 w-6 min-w-0 -translate-y-1/2 p-2 shadow-md sm:h-7 sm:w-7 sm:p-0"
        >
          <ArrowBigLeftIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNextWeek}
          className="absolute top-[calc(50%+0.75rem)] right-0 z-10 aspect-square h-6 w-6 min-w-0 -translate-y-1/2 p-2 shadow-md sm:h-7 sm:w-7 sm:p-0"
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
