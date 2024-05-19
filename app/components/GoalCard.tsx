import type { loader } from '~/routes/dashboard.goals';
import { useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { differenceInCalendarDays } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import GoalLineGraph from './GoalLineGraph';
import { NewEntryPopover } from './NewEntryPopover';
import { Button } from './ui/button';

const MotionCard = motion(Card);

interface ProgressBarProps {
  progressPercent: string;
}
function ProgressBar({ progressPercent }: ProgressBarProps) {
  return (
    <>
      <div className="w-[calc(100% + 48px)] -mx-3 flex h-3 rounded bg-gray-200 [&>:first-child]:rounded-l [&>:last-child]:rounded-r-md">
        <div className="h-3 bg-blue-200" style={{ width: progressPercent }} />
      </div>
    </>
  );
}
interface GoalCardProps {
  title: string;
  description: string | null;
  currentValue: number;
  target: number;
  unit: string;
  id: number;
  startDate: string;
  targetDate: string;
}
export default function GoalCard({
  title,
  description,
  currentValue,
  target,
  // unit,
  id,
  startDate,
  targetDate,
}: GoalCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { entries } =
    useRouteLoaderData<typeof loader>('routes/dashboard.goals') || {};

  const [searchParams, setSearchParams] = useSearchParams();

  const isExpanded = searchParams.get('toggled') === String(id);

  const toggleExpansion = () => {
    if (isExpanded) {
      searchParams.delete('toggled');
    } else {
      searchParams.set('toggled', String(id));
    }
    setSearchParams(searchParams);
  };

  const progressPercent = `${Math.max(
    Math.min((currentValue / target) * 100, 100),
    0,
  ).toFixed(0)}%`;

  const daysLeft =
    differenceInCalendarDays(new Date(targetDate), new Date()) || 0;

  // const delayedAutoScroll = () =>
  //   cardRef.current?.scrollIntoView({
  //     behavior: 'smooth',
  //     block: 'center',
  //     inline: 'center',
  //   });

  // useEffect(() => {
  //   const timer = setTimeout(delayedAutoScroll, 300);
  //   return () => clearTimeout(timer);
  // }, [isExpanded]);

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
      >
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="">
              <span className="text-2xl">{title}</span>
            </CardTitle>
            <NewEntryPopover id={id} />
          </div>
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* // TODO: align number without the percent */}
          <p className="text-center text-4xl font-semibold">
            {progressPercent}
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span>{currentValue}</span>
              <span>{target} words</span>
            </div>
            <ProgressBar progressPercent={progressPercent} />
            <div className="flex justify-between text-xs">
              <span>On track</span>
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
          >
            {/* <Link to={`?toggled=${id}`} > */}
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            {/* </Link> */}
          </Button>
        </CardFooter>
      </MotionCard>
      {/* TODO: fix awkward animation & content jumping */}
      {isExpanded && (
        <motion.div
          className="col-span-full flex max-h-96 justify-center"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: {
              delay: 0.25,
              type: 'tween',
            },
          }}
          exit={{
            opacity: 0,
            transition: {
              type: 'tween',
            },
          }}
        >
          {entries && (
            <GoalLineGraph
              entries={entries}
              currentValue={currentValue}
              targetDate={targetDate}
              target={target}
              startDate={startDate}
            />
          )}
        </motion.div>
      )}
    </>
  );
}
