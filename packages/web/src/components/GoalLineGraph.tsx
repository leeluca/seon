import type { Database } from '~/lib/powersync/AppSchema';

import { useQuery } from '@powersync/react';
import { eachDayOfInterval, isSameDay, lightFormat } from 'date-fns';

import db from '~/lib/database';
import { LineGraph, LineGraphProps } from './charts/LineGraph';

interface GetGraphDataArgs extends Omit<GoalLineGraphProps, 'id'> {
  entries: Database['entry'][];
}
function getGraphData({
  entries,
  initialValue,
  target,
  targetDate,
  startDate,
}: GetGraphDataArgs) {
  const daysUntilTarget = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(targetDate),
  });

  const itemsPerDay = target / daysUntilTarget.length;

  const goalBaselineData = [...Array(daysUntilTarget.length).keys()].map((i) =>
    Math.round(Math.min((i + 1) * itemsPerDay, target)),
  );

  const populatedEntries: (
    | Database['entry']
    | { value: number; date: Date }
  )[] = [];
  for (const day of daysUntilTarget) {
    if (day > new Date()) {
      break;
    }
    const entryIndex = entries.findIndex((entry) => isSameDay(day, entry.date));
    if (entryIndex !== -1) {
      populatedEntries.push(entries[entryIndex]);
    } else {
      populatedEntries.push({
        value: 0,
        date: day,
      });
    }
  }

  const cumulativeEntryData = populatedEntries.reduce<number[]>((acc, curr) => {
    const previousTotal = acc[acc.length - 1] || initialValue;
    return [...acc, previousTotal + curr.value];
  }, []);

  const labels = daysUntilTarget.map((day) =>
    lightFormat(new Date(day), 'yyyy/MM/dd'),
  );

  const graphData: LineGraphProps = {
    data: {
      labels,
      datasets: [
        {
          label: 'New Words',
          data: cumulativeEntryData,
          fill: true,
          backgroundColor: 'rgba(255, 99, 13, 0.1)',
          borderColor: 'rgba(255, 99, 132, 0.8)',
        },
        {
          label: 'Goal',
          data: goalBaselineData,
          fill: false,
          backgroundColor: 'rgba(54, 162, 235, 0.4)',
          borderColor: 'rgba(54, 162, 235, 0.2)',
          borderDash: [3, 5],
        },
      ],
    },
  };
  return graphData;
}

interface GoalLineGraphProps {
  id: string;
  currentValue: Database['goal']['currentValue'];
  target: Database['goal']['target'];
  targetDate: string;
  startDate: string;
  initialValue: Database['goal']['initialValue'];
}
const GoalLineGraph = ({
  id,
  currentValue,
  target,
  targetDate,
  startDate,
  initialValue,
}: GoalLineGraphProps) => {
  const { data: entries } = useQuery(
    db.selectFrom('entry').selectAll().where('goalId', '=', id),
  );

  const { data: preparedData } = getGraphData({
    entries,
    currentValue,
    target,
    targetDate,
    startDate,
    initialValue,
  });

  return <LineGraph data={preparedData} />;
};

export default GoalLineGraph;
