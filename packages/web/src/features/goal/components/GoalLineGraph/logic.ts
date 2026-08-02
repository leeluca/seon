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

import type { Database } from '~/data/db/AppSchema';
import type { GoalType } from '~/features/goal/model';
import type { EChartsOption } from '~/shared/components/common/charts/echarts';

export type IntervalMode = 'day' | 'week' | 'month';

export const MODE_ORDER: IntervalMode[] = ['day', 'week', 'month'];

const FALLBACK_TOKENS = {
  '--primary': 'oklch(0.53 0.105 163)',
  '--chart-2': 'oklch(0.77 0.012 165)',
  '--chart-4': 'oklch(0.74 0.14 163)',
  '--warning': 'oklch(0.56 0.125 75)',
  '--border': 'oklch(0.925 0.008 160)',
  '--muted-foreground': 'oklch(0.5 0.02 170)',
  '--foreground': 'oklch(0.26 0.015 165)',
  '--card': 'oklch(1 0 0)',
} as const;

type TokenName = keyof typeof FALLBACK_TOKENS;

const withAlpha = (color: string, alpha: number) => {
  if (color.startsWith('oklch(') && !color.includes('/')) {
    return color.replace(/\)$/, ` / ${alpha})`);
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(/\)$/, `, ${alpha})`);
  }
  return color;
};

// ECharts paints to canvas, so CSS var() strings can't be used directly —
// resolve the theme tokens to concrete colors at build time instead.
const resolveChartColors = (): Record<TokenName, string> => {
  const resolved: Record<TokenName, string> = { ...FALLBACK_TOKENS };
  if (typeof document === 'undefined') return resolved;
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  for (const token of Object.keys(FALLBACK_TOKENS) as TokenName[]) {
    probe.style.color = `var(${token})`;
    const value = getComputedStyle(probe).color;
    if (value) resolved[token] = value;
  }
  probe.remove();
  return resolved;
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

  const tokens = resolveChartColors();
  const colors = {
    progressLine: tokens['--primary'],
    progressArea: withAlpha(tokens['--primary'], 0.1),
    afterTargetLine: tokens['--warning'],
    afterTargetArea: withAlpha(tokens['--warning'], 0.12),
    baseline: tokens['--chart-2'],
    achieved: tokens['--chart-4'],
    axisLabel: tokens['--muted-foreground'],
    splitLine: tokens['--border'],
    text: tokens['--foreground'],
    surface: tokens['--card'],
  };

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

      const labels = points.map(
        (point) => point.label.charAt(0).toUpperCase() + point.label.slice(1),
      );

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
          top: 0,
          textStyle: { color: colors.text },
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
          backgroundColor: colors.surface,
          borderColor: colors.splitLine,
          textStyle: { color: colors.text },
          axisPointer: {
            type: 'line',
            lineStyle: { color: colors.axisLabel },
          },
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
                `<div style="margin-top: 4px; color: ${colors.progressLine}; font-weight: 600;">${achievedLabel}</div>`,
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
          axisLine: {
            lineStyle: { color: colors.splitLine },
          },
          axisLabel: {
            interval: 'auto',
            fontSize: isMobile ? 11 : 12,
            lineHeight: isMobile ? 14 : 16,
            hideOverlap: true,
            alignMaxLabel: 'right',
            color: colors.axisLabel,
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          axisLabel: {
            fontSize: isMobile ? 11 : 12,
            color: colors.axisLabel,
          },
          splitLine: {
            lineStyle: {
              color: colors.splitLine,
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
                  borderColor: colors.splitLine,
                  fillerColor: withAlpha(colors.progressLine, 0.1),
                  handleStyle: {
                    color: colors.surface,
                    borderColor: colors.axisLabel,
                  },
                  moveHandleStyle: {
                    color: withAlpha(colors.progressLine, 0.3),
                  },
                  dataBackground: {
                    lineStyle: { color: colors.baseline },
                    areaStyle: { color: withAlpha(colors.baseline, 0.3) },
                  },
                  selectedDataBackground: {
                    lineStyle: { color: colors.progressLine },
                    areaStyle: { color: withAlpha(colors.progressLine, 0.15) },
                  },
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
                      color: colors.achieved,
                      borderColor: colors.achieved,
                      borderWidth: 2,
                    }
                  : undefined,
            })),
            connectNulls: false,
            showSymbol: true,
            symbolSize,
            lineStyle: { width: 3, color: colors.progressLine },
            areaStyle: { color: colors.progressArea },
            itemStyle: {
              color: colors.progressLine,
              borderColor: colors.progressLine,
            },
            emphasis: { focus: 'series' },
            z: 3,
          },
          {
            name: baselineLabel,
            type: 'line',
            data: baselineSeries,
            connectNulls: false,
            showSymbol: false,
            lineStyle: {
              width: 2,
              type: 'dashed',
              color: colors.baseline,
            },
            itemStyle: { color: colors.baseline },
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
                            color: colors.achieved,
                            borderColor: colors.achieved,
                            borderWidth: 2,
                          }
                        : undefined,
                  })),
                  connectNulls: false,
                  showSymbol: true,
                  symbolSize,
                  lineStyle: { width: 3, color: colors.afterTargetLine },
                  areaStyle: { color: colors.afterTargetArea },
                  itemStyle: {
                    color: colors.afterTargetLine,
                    borderColor: colors.afterTargetLine,
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
