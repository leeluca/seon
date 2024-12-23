import type { Database } from '~/lib/powersync/AppSchema';

import { useQuery } from '@powersync/react';
import {
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
} from 'date-fns';

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
    // TODO: Always display startDate and targetDate
    // const adjustedWeeks = [
    //   new Date(startDate),
    //   ...weeks.slice(1, -1),
    //   new Date(targetDate),
    // ];

    dates = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
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

  const latestDate = Math.max(lastEntryDate.getTime(), targetDateObj.getTime());

  const totalDays = differenceInDays(latestDate, startDateObj);

  let mode: IntervalMode = 'day';
  if (totalDays > 30 && totalDays <= 200) mode = 'week';
  if (totalDays > 200) mode = 'month';

  const aggregated = buildIntervals({
    start: startDateObj,
    end: new Date(latestDate),
    mode,
    entries,
    targetDate: targetDateObj,
    target,
  });

  // X-axis labels
  const labels = aggregated.map((item) => {
    if (mode === 'day' || mode === 'week') return format(item.date, 'MMM, do');
    return format(item.date, 'MMM, yyyy');
  });

  let runningTotal = initialValue;
  const cumulativeAll = aggregated.map((item) => {
    runningTotal += item.value;
    return { date: item.date, total: runningTotal, baseline: item.baseline };
  });

  const fullProgress = cumulativeAll.map((p) => p.total);
  const baselineData = cumulativeAll.map((p) => p.baseline);

  const graphData: LineGraphProps = {
    options: {
      responsive: true,
    },
    data: {
      labels,
      // TODO: separate data that's after the target date into a separate dataset?
      datasets: [
        {
          label: 'Your Progress',
          data: fullProgress,
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

  return graphData;
}

function GoalLineGraph({
  goalId,
  target,
  targetDate,
  startDate,
  initialValue,
}: GoalLineGraphProps) {
  const { data: entries } = useQuery(
    db
      .selectFrom('entry')
      .selectAll()
      .where('goalId', '=', goalId)
      .orderBy('date', 'asc'),
  );

  // TODO: add a placeholder for when no entries exist
  if (!entries.length) return null;

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
