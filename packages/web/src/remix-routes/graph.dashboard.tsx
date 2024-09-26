import { useRef, useState } from "react";
import { LineGraph, LineGraphProps } from "~/components/charts/LineGraph";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

import {
  addDays,
  eachDayOfInterval,
  lightFormat,
  subDays,
} from "date-fns";

interface StudyDay {
  date: string;
  hours: number;
  newWords: number;
  newGrammar: number;
}
interface GraphData {
  goal: number;
  studyDays: StudyDay[];
  targetDate: Date;
}

function skipInterval(
  studyDays: StudyDay[],
  targetDate: Date,
  daysUntilTarget: Date[]
) {
  const mostRecentStudyDay = new Date(
    Math.max(...studyDays.map((day) => new Date(day.date).getTime()))
  );

  const middleIndex = Math.floor(daysUntilTarget.length / 2);
  const middleDate = daysUntilTarget[middleIndex];

  const skipDays = 10; 

  const potentialSkipStart = subDays(middleDate, skipDays);
  const potentialSkipEnd = addDays(middleDate, skipDays);

  // ensure skipStart is after mostRecentStudyDay and skipEnd is before targetDate
  const skipStart =
    potentialSkipStart.getTime() > mostRecentStudyDay.getTime()
      ? potentialSkipStart
      : mostRecentStudyDay;
  const skipEnd =
    potentialSkipEnd.getTime() < new Date(targetDate).getTime()
      ? potentialSkipEnd
      : new Date(targetDate);

  let previousWasNull = false;
  const skippedIndexes: number[] = [];
  const intervalWithSkipped = daysUntilTarget.flatMap((day, index) => {
    const isBeforeSkipStart = day.getTime() <= skipStart.getTime();
    const isAfterSkipEnd = day.getTime() >= skipEnd.getTime();

    if (isBeforeSkipStart || isAfterSkipEnd) {
      previousWasNull = false;
      return day;
    } else {
      skippedIndexes.push(index);
      if (previousWasNull) {
        return [];
      } else {
        previousWasNull = true;
        return null;
      }
    }
  });
  return { intervalWithSkipped, skippedIndexes };
}
export function getGraphData({
  goal,
  studyDays,
  targetDate,
}: GraphData): LineGraphProps {
  const daysUntilTarget = eachDayOfInterval({
    start: new Date(studyDays[0].date),
    end: new Date(targetDate),
  });

  const { intervalWithSkipped, skippedIndexes } = skipInterval(
    studyDays,
    targetDate,
    daysUntilTarget
  );
  const wordsPerDay = Math.ceil(goal / daysUntilTarget.length);

  const goalData = [...Array(daysUntilTarget.length).keys()].map((i) =>
    Math.min((i + 1) * wordsPerDay, goal)
  );

  const slicedGoalData = goalData.toSpliced(8, skippedIndexes.length -1, null )

  const cumulativeLearnedWords = studyDays.reduce<number[]>((acc, curr) => {
    const previousTotal = acc[acc.length - 1] || 0;
    return [...acc, previousTotal + curr.newWords];
  }, []);


  const labels = intervalWithSkipped.map((day) =>
    day ? lightFormat(new Date(day), "yyyy/MM/dd") : null
  );

  const graphData: LineGraphProps = {
    data: {
      labels,
      datasets: [
        {
          label: "New Words",
          data: cumulativeLearnedWords,
          fill: true,
          backgroundColor: "rgba(255, 99, 13, 0.1)",
          borderColor: "rgba(255, 99, 132, 0.8)",
        },
        {
          label: "Goal",
          data: slicedGoalData,
          fill: false,
          backgroundColor: "rgba(54, 162, 235, 0.4)",
          borderColor: "rgba(54, 162, 235, 0.2)",
          borderDash: [3, 5],
        },
      ],
    },
  };
  return graphData;
}

export const mockData: GraphData = {
  goal: 1000,
  studyDays: [
    {
      date: "2022-01-01",
      hours: 2,
      newWords: 10,
      newGrammar: 10,
    },
    {
      date: "2022-01-02",
      hours: 3,
      newWords: 40,
      newGrammar: 15,
    },
    {
      date: "2022-01-03",
      hours: 4,
      newWords: 20,
      newGrammar: 20,
    },
    {
      date: "2022-01-04",
      hours: 4,
      newWords: 30,
      newGrammar: 10,
    },
    {
      date: "2022-01-07",
      hours: 4,
      newWords: 10,
      newGrammar: 50,
    },
    {
      date: "2022-01-08",
      hours: 4,
      newWords: 10,
      newGrammar: 20,
    },
    // Add more data as needed
  ],
  targetDate: new Date("2022-02-01"),
};

const Dashboard = () => {
  const [goal, setGoal] = useState(0);
  // const [studyDays, setStudyDays] = useState<StudyDay[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const { data } = getGraphData(mockData);

  return (
    <div className="w-full">
      <h1>Dashboard</h1>
      {!!goal && <p>Goal: {goal}</p>}
      <Input type="number" ref={inputRef} />
      <Button onClick={() => setGoal(Number(inputRef.current?.value))}>
        Set Goal
      </Button>
      <LineGraph data={data} />
    </div>
  );
};

export default Dashboard;
