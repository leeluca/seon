import type { Database } from '~/lib/powersync/AppSchema';

import { Trans } from '@lingui/macro';
import { useSuspenseQuery } from '@powersync/react';
import {
  closestTo,
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
} from 'date-fns';
import { ChartLineIcon } from 'lucide-react';

import db from '~/lib/database';
import { LineGraph, LineGraphProps } from './charts/LineGraph';

interface GoalLineGraphProps {
  goalId: string;
  target: Database['goal']['target'];
  targetDate: string;
  startDate: string;
  initialValue: Database['goal']['initialValue'];
}

interface GetGraphDataArgs extends Omit<GoalLineGraphProps, 'goalId'> {
  entries: Database['entry'][];
}

function sumEntriesForDate(
  entries: Database['entry'][],
  date: Date,
  checkFunc: (entryDate: Date, targetDate: Date) => boolean,
) {
  const filtered = entries.filter((entry) =>
    checkFunc(new Date(entry.date), date),
  );
  return filtered.reduce((sum, entry) => sum + entry.value, 0);
}

type IntervalMode = 'day' | 'week' | 'month';
interface BuildIntervalsArgs {
  start: Date;
  end: Date;
  mode: IntervalMode;
  entries: Database['entry'][];
  targetDate: Date;
  target: number;
}
function buildIntervals({
  start,
  end,
  mode,
  entries,
  targetDate,
  target,
}: BuildIntervalsArgs) {
  let dates: Date[];
  let datesUntilTarget: Date[];
  if (mode === 'day') {
    dates = eachDayOfInterval({ start, end });
    datesUntilTarget = eachDayOfInterval({ start, end: targetDate });
  } else if (mode === 'week') {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    // NOTE: Always display startDate and targetDate days
    dates = [new Date(start), ...weeks.slice(1, -1), new Date(targetDate)];

    datesUntilTarget = eachWeekOfInterval(
      { start, end: targetDate },
      { weekStartsOn: 1 },
    );
  } else {
    dates = eachMonthOfInterval({ start, end });
    datesUntilTarget = eachMonthOfInterval({ start, end: targetDate });
  }

  const itemsPerInterval = target / datesUntilTarget.length;

  return dates.map((d, i) => {
    const baseline = Math.round(Math.min((i + 1) * itemsPerInterval, target));

    let checkFunc = isSameDay;
    if (mode === 'week') {
      checkFunc = (ed, td) => isSameWeek(ed, td, { weekStartsOn: 1 });
    }
    if (mode === 'month') {
      checkFunc = isSameMonth;
    }

    const value = sumEntriesForDate(entries, d, checkFunc);
    return { date: d, baseline, value };
  });
}

function getGraphData({
  entries,
  initialValue,
  target,
  targetDate,
  startDate,
}: GetGraphDataArgs) {
  const startDateObj = new Date(startDate);
  const targetDateObj = new Date(targetDate);

  const lastEntryDate = new Date(entries[entries.length - 1]?.date);

  const latestDate = new Date(
    Math.max(lastEntryDate.getTime(), targetDateObj.getTime()),
  );

  const totalDays = differenceInDays(latestDate, startDateObj);

  let mode: IntervalMode = 'day';
  if (totalDays > 30 && totalDays <= 200) mode = 'week';
  if (totalDays > 200) mode = 'month';

  const aggregated = buildIntervals({
    start: startDateObj,
    end: latestDate,
    mode,
    entries,
    targetDate: targetDateObj,
    target,
  });

  const labels = aggregated.map((item) => {
    if (mode === 'month') {
      return [
        format(item.date, 'MMM, yyyy'),
        // NOTE: display start and target dates's day
        isSameMonth(item.date, startDateObj) ||
        isSameMonth(item.date, targetDateObj)
          ? format(
              closestTo(item.date, [startDateObj, targetDateObj]) || item.date,
              ' (do)',
            )
          : '',
      ];
    }
    return format(item.date, 'MMM, do');
  });

  let runningTotal = initialValue;
  const cumulativeAll = aggregated.map((item) => {
    runningTotal += item.value;
    return { date: item.date, total: runningTotal, baseline: item.baseline };
  });

  const progress = cumulativeAll
    .filter(({ date }) => date <= new Date(lastEntryDate))
    .map((p) => p.total);
  const baselineData = cumulativeAll.map((p) => p.baseline);

  const graphData: LineGraphProps = {
    options: {
      responsive: true,
    },
    data: {
      labels,
      datasets: [
        {
          label: 'Your Progress',
          data: progress,
          fill: true,
          borderColor: 'rgba(54, 162, 235, 0.8)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          pointBackgroundColor: (ctx) => {
            const idx = ctx.dataIndex;
            const isAfterTarget = aggregated[idx]?.date > targetDateObj;
            return isAfterTarget
              ? 'rgba(255, 205, 86, 0.1)'
              : 'rgba(54, 162, 235, 0.1)';
          },
          pointBorderColor: (ctx) => {
            const idx = ctx.dataIndex;
            const isAfterTarget = aggregated[idx]?.date > targetDateObj;

            return isAfterTarget
              ? 'rgba(255, 205, 86, 0.8)'
              : 'rgba(54, 162, 235, 0.8)';
          },
          pointStyle: (ctx) => {
            const value = ctx.raw as number;
            const isTargetAchieved = value >= target;
            return isTargetAchieved ? 'star' : 'circle';
          },
          pointRadius: 5,
          pointHoverRadius: 7,
          // TODO: if touch device, make points bigger
          // pointRadius: 10,
          // pointHoverRadius: 15,

          // TODO: refactor into separate functions
          // Show points after targetDate in a different color
          segment: {
            borderColor: (ctx) => {
              const startIdx = ctx.p0DataIndex;
              const endIdx = ctx.p1DataIndex;

              const isAfterTarget =
                aggregated[startIdx]?.date > targetDateObj ||
                aggregated[endIdx]?.date > targetDateObj;

              return isAfterTarget
                ? 'rgba(255, 205, 86, 0.8)'
                : 'rgba(54, 162, 235, 0.8)';
            },

            backgroundColor: (ctx) => {
              const startIdx = ctx.p0DataIndex;
              const endIdx = ctx.p1DataIndex;
              const isAfterTarget =
                aggregated[startIdx]?.date > targetDateObj ||
                aggregated[endIdx]?.date > targetDateObj;

              return isAfterTarget
                ? 'rgba(255, 205, 86, 0.1)'
                : 'rgba(54, 162, 235, 0.1)';
            },
          },
        },

        {
          label: 'Goal Benchmark',
          data: baselineData,
          fill: false,
          borderColor: 'rgba(255, 99, 132, 0.8)',
          borderDash: [5, 5],
          pointRadius: 5,
          pointHoverRadius: 7,
          pointStyle: (ctx) => {
            const value = ctx.raw as number;
            const isOverTargetValue = value >= target;
            return isOverTargetValue ? 'star' : 'circle';
          },
        },
      ],
    },
  };
  // TODO: move data that's after the target date into this separate dataset?
  // NOTE: empty dataset to show the legend
  if (lastEntryDate > targetDateObj) {
    graphData.data.datasets.push({
      label: 'Entries after target date',
      data: [],
      fill: true,
      borderColor: 'rgba(255, 205, 86, 0.8)',
      backgroundColor: 'rgba(255, 205, 86, 0.1)',
      pointRadius: 0,
      pointHoverRadius: 0,
    });
  }

  return graphData;
}

function GoalLineGraph({
  goalId,
  target,
  targetDate,
  startDate,
  initialValue,
}: GoalLineGraphProps) {
  const { data: entries } = useSuspenseQuery(
    db
      .selectFrom('entry')
      .selectAll()
      .where('goalId', '=', goalId)
      .orderBy('date', 'asc'),
  );

  if (!entries.length) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2">
          <ChartLineIcon size={28} />
          <p className="text-lg">
            <Trans>Your progress graph will be shown here</Trans>
          </p>
        </div>
        <p className="text-md">
          <Trans>Add your first entry to start</Trans>
        </p>
      </div>
    );
  }

  const graphData = getGraphData({
    entries,
    target,
    targetDate,
    startDate,
    initialValue,
  });

  return (
    <LineGraph
      data={graphData.data}
      options={{
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
            },
          },
        },
      }}
    />
  );
}

export default GoalLineGraph;
