import type { Entry, Goal } from '@prisma/client';
import { eachDayOfInterval, isSameDay, lightFormat } from 'date-fns';
import { LineGraph, LineGraphProps } from './charts/LineGraph';

function getGraphData({
  entries,
  currentValue,
  target,
  targetDate,
  startDate,
}: GoalLineGraphProps): LineGraphProps {
  const daysUntilTarget = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(targetDate),
  });

  const wordsPerDay = Math.ceil(target / daysUntilTarget.length);

  const goalBaselineData = [...Array(daysUntilTarget.length).keys()].map((i) =>
    Math.min((i + 1) * wordsPerDay, target),
  );

  const entryDayIndexes = entries.map((entry) =>
    daysUntilTarget.findIndex((day) => isSameDay(day, entry.date)),
  );

  const cumulativeLearnedWords = entries.reduce<number[]>((acc, curr) => {
    const previousTotal = acc[acc.length - 1] || currentValue || 0;
    return [...acc, previousTotal + curr.value];
  }, []);

  const actualProgressData = [...goalBaselineData].map((value, index) => {
    if (entryDayIndexes.includes(index)) {
      return value + cumulativeLearnedWords[entryDayIndexes.indexOf(index)];
    }
    if (index > entryDayIndexes[entryDayIndexes.length - 1]) {
      return;
    }

    return value;
  });

  const labels = daysUntilTarget.map((day) =>
    day ? lightFormat(new Date(day), 'yyyy/MM/dd') : null,
  );

  const graphData: LineGraphProps = {
    data: {
      labels,
      datasets: [
        {
          label: 'New Words',
          data: actualProgressData,
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
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonType<T> = {
  [K in keyof T]: T[K] extends JsonValue ? T[K] : string;
};

interface GoalLineGraphProps {
  entries: JsonType<Entry>[];
  currentValue: Goal['currentValue'];
  target: Goal['target'];
  targetDate: string;
  startDate: string;
}
const GoalLineGraph = ({
  entries,
  currentValue,
  target,
  targetDate,
  startDate,
}: GoalLineGraphProps) => {
  const { data: preparedData } = getGraphData({
    entries,
    currentValue,
    target,
    targetDate,
    startDate,
  });
  // console.log(preparedData);
  if (!preparedData) return null;
  return <LineGraph data={preparedData} />;
};

export default GoalLineGraph;
