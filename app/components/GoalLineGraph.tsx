import type { Entry, Goal } from '@prisma/client';
import type { loader } from '~/routes/api.entries.$goalId';
import type { JsonType } from '~/types';
import { useFetcher } from '@remix-run/react';
import { eachDayOfInterval, isSameDay, lightFormat } from 'date-fns';
import { LineGraph, LineGraphProps } from './charts/LineGraph';

interface GetGraphDataArgs extends Omit<GoalLineGraphProps, 'id'> {
  entries: JsonType<Entry>[];
}
function getGraphData({
  entries,
  currentValue,
  target,
  targetDate,
  startDate,
}: GetGraphDataArgs) {
  const daysUntilTarget = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(targetDate),
  });

  const itemsPerDay = Math.ceil(target / daysUntilTarget.length);

  const goalBaselineData = [...Array(daysUntilTarget.length).keys()].map((i) =>
    Math.min((i + 1) * itemsPerDay, target),
  );

  const populatedEntries: (JsonType<Entry> | { value: number; date: Date })[] =
    [];
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

  const cumulativeLearnedWords = populatedEntries.reduce<number[]>(
    (acc, curr) => {
      const previousTotal = acc[acc.length - 1] || currentValue;
      return [...acc, previousTotal + curr.value];
    },
    [],
  );

  const labels = daysUntilTarget.map((day) =>
    lightFormat(new Date(day), 'yyyy/MM/dd'),
  );

  const graphData: LineGraphProps = {
    data: {
      labels,
      datasets: [
        {
          label: 'New Words',
          data: cumulativeLearnedWords,
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
  id: number;
  currentValue: Goal['currentValue'];
  target: Goal['target'];
  targetDate: string;
  startDate: string;
}
const GoalLineGraph = ({
  id,
  currentValue,
  target,
  targetDate,
  startDate,
}: GoalLineGraphProps) => {
  const entryFetcher = useFetcher<typeof loader>({ key: `entries-${id}` });

  const { data: preparedData } = getGraphData({
    entries: entryFetcher.data?.entries || [],
    currentValue,
    target,
    targetDate,
    startDate,
  });

  if (!preparedData) return null;
  return <LineGraph data={preparedData} />;
};

export default GoalLineGraph;
