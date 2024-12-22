import type { Database } from '~/lib/powersync/AppSchema';

import { useQuery } from '@powersync/react';
import {
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

// TODO: include entries that happened after targetDate
// TODO: improve mobile view
interface GetGraphDataArgs extends Omit<GoalLineGraphProps, 'goalId'> {
  entries: Database['entry'][];
}
function getGraphData({
  entries,
  initialValue,
  target,
  targetDate,
  startDate,
}: GetGraphDataArgs) {
  const totalDays = Math.ceil(
    (new Date(targetDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  let labels: (string | string[])[] = [];
  let goalBaselineData: number[] = [];
  let aggregatedEntries: { value: number; date: Date }[] = [];

  if (totalDays <= 30) {
    const days = eachDayOfInterval({
      start: new Date(startDate),
      end: new Date(targetDate),
    });

    const itemsPerDay = target / days.length;

    goalBaselineData = days.map((_, i) =>
      Math.round(Math.min((i + 1) * itemsPerDay, target)),
    );

    aggregatedEntries = days.map((day) => {
      const dayEntries = entries.filter((entry) => isSameDay(entry.date, day));
      const totalValue = dayEntries.reduce(
        (sum, entry) => sum + entry.value,
        0,
      );
      return {
        value: totalValue,
        date: day,
      };
    });

    labels = days.map((day) => format(day, 'MMM, do'));
  } else if (totalDays <= 200) {
    // Aggregate by week
    const weeks = eachWeekOfInterval(
      {
        start: new Date(startDate),
        end: new Date(targetDate),
      },
      { weekStartsOn: 1 },
    );

    const itemsPerWeek = target / weeks.length;

    goalBaselineData = weeks.map((_, i) =>
      Math.round(Math.min((i + 1) * itemsPerWeek, target)),
    );

    // Always display startDate and targetDate
    const adjustedWeeks = [
      new Date(startDate),
      ...weeks.slice(1, -1),
      new Date(targetDate),
    ];

    aggregatedEntries = adjustedWeeks.map((weekStart) => {
      const weekEntries = entries.filter((entry) =>
        isSameWeek(entry.date, weekStart, { weekStartsOn: 1 }),
      );
      const totalValue = weekEntries.reduce(
        (sum, entry) => sum + entry.value,
        0,
      );
      return {
        value: totalValue,
        date: weekStart,
      };
    });

    labels = adjustedWeeks.map((weekStart) => format(weekStart, 'MMM, do'));
  } else {
    // Aggregate by month
    const months = eachMonthOfInterval({
      start: new Date(startDate),
      end: new Date(targetDate),
    });

    const itemsPerMonth = target / months.length;

    goalBaselineData = months.map((_, i) =>
      Math.round(Math.min((i + 1) * itemsPerMonth, target)),
    );

    // Always display startDate and targetDate
    const adjustedMonths = [
      new Date(startDate),
      ...months.slice(1, -1),
      new Date(targetDate),
    ];
    aggregatedEntries = adjustedMonths.map((monthStart) => {
      const monthEntries = entries.filter((entry) =>
        isSameMonth(entry.date, monthStart),
      );
      const totalValue = monthEntries.reduce(
        (sum, entry) => sum + entry.value,
        0,
      );
      return {
        value: totalValue,
        date: monthStart,
      };
    });

    labels = adjustedMonths.map((monthStart, i) =>
      i === 0 || i === adjustedMonths.length - 1
        ? [format(monthStart, 'MMM, yyyy'), format(monthStart, '(do)')]
        : format(monthStart, 'MMM, yyyy'),
    );
  }

  const cumulativeEntryData = aggregatedEntries.reduce<number[]>(
    (acc, curr) => {
      const previousTotal = acc[acc.length - 1] || initialValue;
      return [...acc, previousTotal + curr.value];
    },
    [],
  );

  const graphData: LineGraphProps = {
    data: {
      labels,
      datasets: [
        {
          label: 'Your Progress',
          data: cumulativeEntryData,
          fill: true,
          borderColor: 'rgba(54, 162, 235, 0.8)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
        },
        {
          label: 'Goal Benchmark',
          data: goalBaselineData,
          fill: false,
          borderColor: 'rgba(255, 99, 132, 0.8)',

          borderDash: [5, 5],
        },
      ],
    },
  };

  return graphData;
}
interface GoalLineGraphProps {
  goalId: string;
  target: Database['goal']['target'];
  targetDate: string;
  startDate: string;
  initialValue: Database['goal']['initialValue'];
}
const GoalLineGraph = ({
  goalId,
  target,
  targetDate,
  startDate,
  initialValue,
}: GoalLineGraphProps) => {
  const { data: entries } = useQuery(
    db.selectFrom('entry').selectAll().where('goalId', '=', goalId),
  );

  const { data: preparedData } = getGraphData({
    entries,
    target,
    targetDate,
    startDate,
    initialValue,
  });

  return (
    <LineGraph
      data={preparedData}
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
};

export default GoalLineGraph;
