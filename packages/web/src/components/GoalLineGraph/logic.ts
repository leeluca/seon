import { i18n, type MessageDescriptor } from '@lingui/core';
import { msg, t } from '@lingui/core/macro';
import {
  closestTo,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
} from 'date-fns';

import type { Database } from '~/lib/powersync/AppSchema';
import type { GoalType } from '~/types/goal';
import type { EChartsOption } from '../charts/echarts';

export type IntervalMode = 'day' | 'week' | 'month';

export const MODE_ORDER: IntervalMode[] = ['day', 'week', 'month'];

const COLORS = {
  progressLine: 'rgba(54, 162, 235, 0.9)',
  progressArea: 'rgba(224, 242, 254, 0.55)',
  afterTargetLine: 'rgba(255, 205, 86, 0.9)',
  afterTargetArea: 'rgba(255, 205, 86, 0.18)',
  baseline: 'rgba(255, 99, 132, 0.9)',
  achieved: 'rgba(34, 197, 94, 0.8)',
};

const MAX_POINTS_WITHOUT_ZOOM = {
  mobile: 35,
  desktop: 70,
};

const DEFAULT_WINDOW_POINTS = {
  mobile: 22,
  desktop: 40,
};

const MODE_LABEL_DESCRIPTORS: Record<IntervalMode, MessageDescriptor> = {
  day: msg`Daily`,
  week: msg`Weekly`,
  month: msg`Monthly`,
};

export const getModeLabels = (): Record<IntervalMode, string> => ({
  day: i18n._(MODE_LABEL_DESCRIPTORS.day),
  week: i18n._(MODE_LABEL_DESCRIPTORS.week),
  month: i18n._(MODE_LABEL_DESCRIPTORS.month),
});

interface BuildIntervalsArgs {
  start: Date;
  end: Date;
  mode: IntervalMode;
  targetDate: Date;
}

interface AggregatedPoint {
  date: Date;
  label: string;
  baseline: number;
  progressValue: number | null;
  isAfterTarget: boolean;
  isAchieved: boolean;
  hasUserEntry: boolean;
}

interface BuildGraphArgs {
  entries: Database['entry'][];
  target: number;
  targetDate: string;
  startDate: string;
  initialValue: number;
  goalType: GoalType;
  locale: string;
  isMobile: boolean;
}

interface ModeGraph {
  option: EChartsOption;
  totalPoints: number;
}

export interface GoalLineGraphBuildResult {
  defaultMode: IntervalMode;
  optionsByMode: Record<IntervalMode, ModeGraph>;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toDate = (value: string) => new Date(value);

const buildIntervals = ({
  start,
  end,
  mode,
  targetDate,
}: BuildIntervalsArgs) => {
  if (mode === 'day') {
    return eachDayOfInterval({ start, end });
  }

  if (mode === 'week') {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    const candidates = [
      new Date(start),
      new Date(end),
      new Date(targetDate),
      ...weeks.slice(1),
    ];

    const unique = Array.from(
      new Map(
        candidates.map((date) => [date.toDateString(), new Date(date)]),
      ).values(),
    );

    return unique.sort((a, b) => a.getTime() - b.getTime());
  }

  return eachMonthOfInterval({ start, end });
};

const formatLabel = (
  date: Date,
  mode: IntervalMode,
  locale: string,
  startDate: Date,
  targetDate: Date,
) => {
  if (mode === 'month') {
    const primary = format(date, locale === 'ko' ? 'MMMyy년' : 'MMM, yyyy');
    const isBoundaryMonth =
      isSameMonth(date, startDate) || isSameMonth(date, targetDate);

    if (!isBoundaryMonth) return primary;

    const anchorDate = closestTo(date, [startDate, targetDate]) ?? date;
    const secondary = format(anchorDate, 'do');
    return `${primary}\n(${secondary})`;
  }

  return format(date, locale === 'ko' ? 'MMMdo' : 'MMM d');
};

const isSameInterval = (
  entryDate: Date,
  targetDate: Date,
  mode: IntervalMode,
) =>
  mode === 'day'
    ? isSameDay(entryDate, targetDate)
    : mode === 'week'
      ? isSameWeek(entryDate, targetDate, { weekStartsOn: 1 })
      : isSameMonth(entryDate, targetDate);

const getIntervalValue = (
  entries: Database['entry'][],
  targetDate: Date,
  mode: IntervalMode,
  goalType: GoalType,
) => {
  const matchingEntries = entries.filter((entry) =>
    isSameInterval(new Date(entry.date), targetDate, mode),
  );

  if (!matchingEntries.length) return null;

  if (goalType === 'PROGRESS') {
    return matchingEntries[matchingEntries.length - 1]?.value ?? null;
  }

  return matchingEntries.reduce((sum, entry) => sum + entry.value, 0);
};

const hasIntervalEntry = (
  entries: Database['entry'][],
  targetDate: Date,
  mode: IntervalMode,
) => {
  return entries.some((entry) =>
    isSameInterval(new Date(entry.date), targetDate, mode),
  );
};

const buildBaselineValues = (
  start: Date,
  targetDate: Date,
  mode: IntervalMode,
  target: number,
) => {
  const intervalsUntilTarget = buildIntervals({
    start,
    end: targetDate,
    mode,
    targetDate,
  });
  const itemsPerInterval =
    target / Math.max(1, intervalsUntilTarget.length || 1);

  return (index: number) =>
    Math.round(Math.min((index + 1) * itemsPerInterval, target));
};

// const computeDefaultMode = (startDate: Date, endDate: Date): IntervalMode => {
//   const totalDays = Math.max(0, differenceInDays(endDate, startDate));

//   if (totalDays > 200) return 'month';
//   if (totalDays > 45) return 'week';
//   return 'day';
// };

const buildZoom = (
  totalPoints: number,
  focusIndex: number,
  isMobile: boolean,
) => {
  if (!totalPoints) {
    return { start: 0, end: 100, needsSlider: false };
  }

  const windowSize = Math.min(
    isMobile ? DEFAULT_WINDOW_POINTS.mobile : DEFAULT_WINDOW_POINTS.desktop,
    totalPoints,
  );
  const span = Math.max(totalPoints - 1, 1);
  const maxWithoutZoom = isMobile
    ? MAX_POINTS_WITHOUT_ZOOM.mobile
    : MAX_POINTS_WITHOUT_ZOOM.desktop;

  if (totalPoints <= maxWithoutZoom) {
    return { start: 0, end: 100, needsSlider: false };
  }

  const startIndex = clamp(
    focusIndex - Math.floor(windowSize / 2),
    0,
    Math.max(totalPoints - windowSize, 0),
  );
  const endIndex = Math.min(startIndex + windowSize - 1, totalPoints - 1);

  return {
    start: (startIndex / span) * 100,
    end: (endIndex / span) * 100,
    needsSlider: true,
  };
};

const buildAggregatedPoints = ({
  entries,
  target,
  targetDate,
  startDate,
  initialValue,
  goalType,
  locale,
  mode,
}: BuildGraphArgs & { mode: IntervalMode }): AggregatedPoint[] => {
  const start = new Date(startDate);
  const targetDateObj = new Date(targetDate);

  const sortedEntries = [...entries].sort(
    (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime(),
  );

  const lastEntryDate =
    sortedEntries[sortedEntries.length - 1]?.date ?? startDate;
  const end = new Date(
    Math.max(new Date(lastEntryDate).getTime(), targetDateObj.getTime()),
  );

  const dates = buildIntervals({ start, end, mode, targetDate: targetDateObj });

  const baselineValue = buildBaselineValues(start, targetDateObj, mode, target);

  let runningTotal = initialValue;
  const today = new Date();

  return dates.map((date, index) => {
    const intervalValue = getIntervalValue(sortedEntries, date, mode, goalType);
    const hasUserEntry = hasIntervalEntry(sortedEntries, date, mode);

    if (goalType === 'PROGRESS') {
      runningTotal = intervalValue ?? runningTotal;
    } else {
      runningTotal += intervalValue ?? 0;
    }

    const isAfterTarget = date > targetDateObj;
    const progressValue = date <= today ? runningTotal : null;
    const label = formatLabel(date, mode, locale, start, targetDateObj);

    return {
      date,
      label,
      baseline: baselineValue(index),
      progressValue,
      isAfterTarget,
      isAchieved: (progressValue ?? runningTotal) >= target,
      hasUserEntry,
    };
  });
};

export const buildGoalLineGraphOptions = ({
  entries,
  target,
  targetDate,
  startDate,
  initialValue,
  goalType,
  locale,
  isMobile,
}: BuildGraphArgs): GoalLineGraphBuildResult => {
  // NOTE: temporarily disabled default mode calculation, restore it when there's an option to save the preferred mode
  // const startDateObj = new Date(startDate);
  // const targetDateObj = new Date(targetDate);

  // const sortedEntries = [...entries].sort(
  //   (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime(),
  // );
  // const lastEntryDate =
  //   sortedEntries[sortedEntries.length - 1]?.date ?? startDate;
  // const latestDate = new Date(
  //   Math.max(new Date(lastEntryDate).getTime(), targetDateObj.getTime()),
  // );

  // const defaultMode = computeDefaultMode(startDateObj, latestDate);

  const defaultMode = 'day';

  const today = new Date();

  const optionsByMode = MODE_ORDER.reduce<Record<IntervalMode, ModeGraph>>(
    (acc, mode) => {
      const points = buildAggregatedPoints({
        entries,
        target,
        targetDate,
        startDate,
        initialValue,
        goalType,
        locale,
        isMobile,
        mode,
      });

      const labels = points.map((point) => point.label);

      const baselineSeries = points.map((point) => point.baseline);
      // Combined progress for the slider data shadow (all progress values)
      const allProgress = points.map((point) => point.progressValue);
      // Keep all progress values for continuous line, but track which have user entries
      const progressBeforeTarget = points.map((point) =>
        !point.isAfterTarget ? point.progressValue : null,
      );
      const progressAfterTarget = points.map((point) =>
        point.isAfterTarget ? point.progressValue : null,
      );
      const hasAfterTargetData = progressAfterTarget.some(
        (value) => value !== null && value !== undefined,
      );

      // Find the first point where the goal was achieved
      const firstAchievementIndex = points.findIndex(
        (point) =>
          point.progressValue !== null && point.progressValue >= target,
      );

      const firstFutureIndex = points.findIndex((point) => point.date >= today);
      const focusIndex =
        firstFutureIndex === -1 ? points.length - 1 : firstFutureIndex;

      const { start, end, needsSlider } = buildZoom(
        points.length,
        Math.max(focusIndex, 0),
        isMobile,
      );

      const symbolSize = (
        value: number | null | undefined,
        params: { dataIndex: number },
      ) => {
        if (params.dataIndex === firstAchievementIndex) {
          return isMobile ? 16 : 14;
        }
        return value && value >= target
          ? isMobile
            ? 12
            : 11
          : isMobile
            ? 9
            : 8;
      };

      const gridBottom = needsSlider ? (isMobile ? 76 : 86) : 50;
      const progressLabel = t`Your Progress`;
      const afterTargetLabel = t`After target date`;
      const baselineLabel = t`Goal Benchmark`;
      // const completionLabel = t`Goal reached`;

      const option: EChartsOption = {
        legend: {
          data: [
            progressLabel,
            baselineLabel,
            ...(hasAfterTargetData ? [afterTargetLabel] : []),
          ],
          left: 8,
          selected: {
            _allProgress: false,
          },
        },
        grid: {
          left: isMobile ? 42 : 52,
          right: isMobile ? 12 : 16,
          top: 50,
          bottom: gridBottom,
          containLabel: false,
        },
        tooltip: {
          trigger: 'axis',
          confine: true,
          axisPointer: { type: 'line' },
          formatter: (params) => {
            if (!Array.isArray(params) || !params.length) return '';

            const dataIndex = params[0]?.dataIndex ?? 0;
            const heading = (labels[dataIndex] ?? '').replace(/\n/g, '<br />');
            const isFirstAchievement = dataIndex === firstAchievementIndex;
            const lines = [`<strong>${heading}</strong>`];

            params.forEach((param) => {
              // `param.value` is the canonical place ECharts exposes the datum value
              const value = (param as unknown as { value?: number | null })
                .value as number | null | undefined;

              if (
                value === null ||
                value === undefined ||
                Number.isNaN(value)
              ) {
                return;
              }

              lines.push(
                `${param.marker} ${param.seriesName}: <strong>${value}</strong>`,
              );
            });

            if (isFirstAchievement) {
              const achievedLabel = t`🎉 Goal achieved!`;
              lines.push(
                `<div style="margin-top: 4px; color: #22c55e; font-weight: 600;">${achievedLabel}</div>`,
              );
            }

            return lines.join('<br />');
          },
          valueFormatter: (value) =>
            typeof value === 'number' ? value.toString() : '',
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: labels,
          axisLabel: {
            interval: 'auto',
            fontSize: isMobile ? 11 : 12,
            lineHeight: isMobile ? 14 : 16,
            hideOverlap: true,
            alignMaxLabel: 'right',
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          axisLabel: {
            fontSize: isMobile ? 11 : 12,
          },
          splitLine: {
            lineStyle: {
              color: '#e5e7eb',
            },
          },
        },
        dataZoom: [
          {
            type: 'inside',
            start,
            end,
            zoomOnMouseWheel: 'shift',
            moveOnMouseMove: 'shift',
            filterMode: 'none' as const,
          },
          ...(needsSlider
            ? [
                {
                  type: 'slider' as const,
                  start,
                  end,
                  height: isMobile ? 32 : 30,
                  bottom: isMobile ? 12 : 18,
                  brushSelect: false,
                  showDetail: false,
                  handleSize: isMobile ? 12 : 10,
                  handleIcon: 'path://M512 64L832 512 512 960 192 512 512 64Z',
                  filterMode: 'none' as const,
                },
              ]
            : []),
        ],
        series: [
          // Hidden series for slider data shadow - contains all progress values
          {
            name: '_allProgress',
            type: 'line',
            data: allProgress,
            showSymbol: false,
            lineStyle: { width: 0, opacity: 0 },
            areaStyle: { opacity: 0 },
            itemStyle: { opacity: 0 },
            silent: true,
            z: 0,
          },
          {
            name: progressLabel,
            type: 'line',
            data: progressBeforeTarget.map((value, index) => ({
              value,
              // Only show symbol for points with user entries
              symbol: !points[index]?.hasUserEntry
                ? 'none'
                : index === firstAchievementIndex
                  ? 'diamond'
                  : 'circle',
              itemStyle:
                index === firstAchievementIndex
                  ? {
                      color: COLORS.achieved,
                      borderColor: COLORS.achieved,
                      borderWidth: 2,
                    }
                  : undefined,
            })),
            connectNulls: false,
            showSymbol: true,
            symbolSize,
            lineStyle: { width: 3, color: COLORS.progressLine },
            areaStyle: { color: COLORS.progressArea },
            itemStyle: {
              color: COLORS.progressLine,
              borderColor: COLORS.progressLine,
            },
            emphasis: { focus: 'series' },
            z: 3,
          },
          {
            name: baselineLabel,
            type: 'line',
            data: baselineSeries,
            connectNulls: false,
            showSymbol: points.length <= 120,
            symbolSize: isMobile ? 9 : 7,
            lineStyle: {
              width: 2,
              type: 'dashed',
              color: COLORS.baseline,
            },
            itemStyle: { color: COLORS.baseline },
            emphasis: { focus: 'series' },
            z: 1,
          },
          ...(hasAfterTargetData
            ? [
                {
                  name: afterTargetLabel,
                  type: 'line' as const,
                  data: progressAfterTarget.map((value, index) => ({
                    value,
                    // Only show symbol for points with user entries
                    symbol: !points[index]?.hasUserEntry
                      ? 'none'
                      : index === firstAchievementIndex
                        ? 'diamond'
                        : 'circle',
                    itemStyle:
                      index === firstAchievementIndex
                        ? {
                            color: COLORS.achieved,
                            borderColor: COLORS.achieved,
                            borderWidth: 2,
                          }
                        : undefined,
                  })),
                  connectNulls: false,
                  showSymbol: true,
                  symbolSize,
                  lineStyle: { width: 3, color: COLORS.afterTargetLine },
                  areaStyle: { color: COLORS.afterTargetArea },
                  itemStyle: {
                    color: COLORS.afterTargetLine,
                    borderColor: COLORS.afterTargetLine,
                  },
                  emphasis: { focus: 'series' as const },
                  z: 2,
                },
              ]
            : []),
        ],
      };

      acc[mode] = { option, totalPoints: points.length };
      return acc;
    },
    {} as Record<IntervalMode, ModeGraph>,
  );

  return { defaultMode, optionsByMode };
};
