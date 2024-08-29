import { useRef, useState } from 'react';
import { goal } from '@prisma/client';
// import { useFetcher } from '@remix-run/react';
import { differenceInCalendarDays, eachDayOfInterval } from 'date-fns';
import { motion } from 'framer-motion';
import GoalLineGraph from '~/components/GoalLineGraph';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { JsonType } from '~/types';
// import { GoalDetailPanel } from './GoalDetailPanel';
// import { NewEntryPopover } from './NewEntryPopover';

const MotionCard = motion(Card);

interface ProgressBarProps {
  progressPercent: string;
}
function ProgressBar({ progressPercent }: ProgressBarProps) {
  return (
    <div className="w-[calc(100% + 48px)] -mx-3 flex h-3 rounded bg-gray-200 [&>:first-child]:rounded-l [&>:last-child]:rounded-r-md">
      <div className="h-3 bg-blue-200" style={{ width: progressPercent }} />
    </div>
  );
}

function getOnTrackValue(differenceFromTarget: number, target: number) {
  const percentageDifference = Math.abs(differenceFromTarget / target) * 100;

  if (percentageDifference <= 5) {
    return <p className="text-blue-500">On track</p>;
  } else if (differenceFromTarget > 0) {
    return <p className="text-green-500">Ahead</p>;
  } else {
    return <p className="text-red-500">Behind</p>;
  }
}

export default function GoalCard({
  title,
  description,
  currentValue,
  target,
  unit,
  id,
  startDate,
  targetDate,
  initialValue,
}: JsonType<goal>) {
  const cardRef = useRef<HTMLDivElement>(null);

  // const entryFetcher = useFetcher({ key: `entries-${id}` });

  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  // FIXME: temporary, won't pass as prop
  const GraphComponent = (
    <GoalLineGraph
      key={`${id}-graph`}
      id={id}
      currentValue={currentValue}
      targetDate={targetDate}
      target={target}
      startDate={startDate}
      initialValue={initialValue}
    />
  );

  const daysUntilTarget = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(targetDate),
  });

  const averageItemsPerDay = (target - initialValue) / daysUntilTarget.length;

  const daysSince =
    differenceInCalendarDays(new Date(), new Date(startDate)) + 1;

  const expectedGoalValueToday = Math.min(
    daysSince * averageItemsPerDay,
    target,
  );

  const differenceFromTarget = currentValue - expectedGoalValueToday;

  const item = getOnTrackValue(differenceFromTarget, target);

  const progressPercent = `${Math.max(
    Math.min((currentValue / target) * 100, 100),
    0,
  ).toFixed(0)}%`;

  const daysLeft =
    differenceInCalendarDays(new Date(targetDate), new Date()) || 0;

  const prefetchEntries = () => {
    if (!entryFetcher.data) {
      entryFetcher.load(`/api/entries/${id}`);
    }
  };

  return (
    <MotionCard
      className="w-full text-center"
      whileTap={{ scale: 0.97, transition: { ease: 'easeIn' } }}
      initial={{ scale: 0 }}
      animate={{
        scale: 1,
        transition: {
          delay: 0.25,
          type: 'tween',
        },
      }}
      exit={{
        opacity: 0,
        scale: 0,
        transition: {
          type: 'tween',
        },
      }}
      layout
      transition={{ ease: 'easeInOut' }}
      ref={cardRef}
      onMouseOver={() => prefetchEntries()}
    >
      <CardHeader
        className="p-4"
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        <div className="flex h-16 items-center">
          <CardTitle className="mr-2 w-60 grow text-center text-2xl">
            {title}
          </CardTitle>
          {/* <NewEntryPopover id={id} /> */}
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent
        className="flex cursor-pointer flex-col gap-3"
        onClick={() => setSidePanelOpen(true)}
        //FIXME: accessibility of div button
      >
        <p className="text-center text-4xl font-semibold">{progressPercent}</p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <span>{currentValue}</span>
            <span>
              {target} {unit || 'items'}
            </span>
          </div>
          <ProgressBar progressPercent={progressPercent} />
          <div className="flex justify-between text-xs">
            <span>{item}</span>
            <span>
              {daysLeft > 0
                ? `${daysLeft} days left`
                : `${Math.abs(daysLeft)} days past`}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between px-3 pb-3 align-middle">
        {/* <span className="text-xs">Category</span> */}
        {/* <GoalDetailPanel
          title={title}
          graphComponent={GraphComponent}
          open={sidePanelOpen}
          onOpenChange={setSidePanelOpen}
        /> */}
      </CardFooter>
    </MotionCard>
  );
}
