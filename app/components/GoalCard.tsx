import { useRef } from 'react';
import { Goal } from '@prisma/client';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { useFetcher, useSearchParams } from '@remix-run/react';
import { differenceInCalendarDays, eachDayOfInterval } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { JsonType } from '~/types';
import GoalLineGraph from './GoalLineGraph';
import { NewEntryPopover } from './NewEntryPopover';
import { Button } from './ui/button';

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
}: JsonType<Goal>) {
  const cardRef = useRef<HTMLDivElement>(null);

  const entryFetcher = useFetcher({ key: `entries-${id}` });

  const [searchParams, setSearchParams] = useSearchParams();

  const isExpanded = searchParams.get('toggled') === String(id);

  // const delayedAutoScroll = () =>
  //   cardRef.current?.scrollIntoView({
  //     behavior: 'smooth',
  //     block: 'center',
  //     inline: 'center',
  //   });

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

  const toggleExpansion = () => {
    if (isExpanded) {
      searchParams.delete('toggled');
    } else {
      searchParams.set('toggled', String(id));
    }
    setSearchParams(searchParams);

    // setTimeout(delayedAutoScroll, 450);
  };

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

  const duration = 0.5;
  return (
    <>
      <MotionCard
        className={`w-full text-center`}
        // whileHover={{ scale: 1.05 }}
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
        transition={{ ease: 'easeInOut', duration: 0.45 }}
        ref={cardRef}
        onHoverStart={() => prefetchEntries()}
      >
        <CardHeader className="p-4">
          <div className="flex h-16 items-center">
            <CardTitle className="mr-2 w-60 grow text-center text-2xl">
              {title}
            </CardTitle>
            <NewEntryPopover id={id} />
          </div>
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-center text-4xl font-semibold">
            {progressPercent}
          </p>
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
          <span className="text-xs">Category</span>
          <Button
            onClick={() => toggleExpansion()}
            size="sm"
            variant="secondary"
            className="h-6 w-6 p-0"
            onMouseOver={() => prefetchEntries()}
          >
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
        </CardFooter>
      </MotionCard>
      <AnimatePresence mode="popLayout">
        {isExpanded && (
          <motion.div
            key={`${id}-graph`}
            className={`col-span-full flex h-96 max-h-96 w-full justify-center`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: duration / 2, delay: duration / 2 },
            }}
            exit={{
              opacity: 0,
              transition: { duration: duration },
            }}
            layout
          >
            <GoalLineGraph
              key={`${id}-graph`}
              id={id}
              currentValue={currentValue}
              targetDate={targetDate}
              target={target}
              startDate={startDate}
              initialValue={initialValue}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
