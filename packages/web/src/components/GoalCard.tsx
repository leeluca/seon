import type { Database } from '~/lib/powersync/AppSchema';

import { useMemo, useRef } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { differenceInCalendarDays, eachDayOfInterval } from 'date-fns';
// import { motion } from 'framer-motion';
import { Maximize2Icon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import db from '~/lib/database';
import { NewEntryPopover } from './NewEntryPopover';
import { Button, buttonVariants } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

// const MotionCard = motion(Card);

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

interface getOnTrackValueArgs {
  currentValue: number;
  initialValue: number;
  target: number;
  startDate: string;
  targetDate: string;
  isCompleted: boolean;
}
function getOnTrackValue({
  currentValue,
  initialValue,
  target,
  startDate,
  targetDate,
  isCompleted,
}: getOnTrackValueArgs) {
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
  const percentageDifference = Math.abs(differenceFromTarget / target) * 100;

  if (isCompleted) {
    return <span className="text-green-500">Completed</span>;
  } else if (percentageDifference <= 5) {
    return <span className="text-blue-500">On track</span>;
  } else if (differenceFromTarget > 0) {
    return <span className="text-green-500">Ahead</span>;
  } else {
    return <span className="text-red-500">Behind</span>;
  }
}

async function deleteGoal(goalId: string, callback?: () => void) {
  await db.deleteFrom('goal').where('id', '=', goalId).execute();
  callback && callback();
}

export default function GoalCard({
  title,
  currentValue,
  target,
  id,
  startDate,
  targetDate,
  initialValue,
  shortId,
}: Database['goal']) {
  const { t } = useLingui();
  const cardRef = useRef<HTMLDivElement>(null);

  const progressPercent = `${Math.max(
    Math.min((currentValue / target) * 100, 100),
    0,
  ).toFixed(0)}%`;

  const daysLeft =
    differenceInCalendarDays(new Date(targetDate), new Date()) || 0;

  const isCompleted = currentValue >= target;

  const progressStatus = useMemo(
    () =>
      getOnTrackValue({
        currentValue,
        initialValue,
        target,
        startDate,
        targetDate,
        isCompleted,
      }),
    [currentValue, initialValue, target, startDate, targetDate, isCompleted],
  );

  return (
    <Card
      className="w-full text-center shadow-sm"
      // whileTap={{ scale: 0.97, transition: { ease: 'easeIn' } }}
      // initial={{ scale: 0 }}
      // animate={{
      //   scale: 1,
      //   transition: {
      //     delay: 0.25,
      //     type: 'tween',
      //   },
      // }}
      // exit={{
      //   opacity: 0,
      //   scale: 0,
      //   transition: {
      //     type: 'tween',
      //   },
      // }}
      // layout
      // transition={{ ease: 'easeInOut' }}
      ref={cardRef}
    >
      <CardHeader
        className="p-4"
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        <div className="flex h-16 items-center">
          <CardTitle className="mr-3 w-60 grow pl-[30px] text-center text-2xl font-medium">
            {title}
          </CardTitle>
          <NewEntryPopover id={id} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="mb-2 text-center text-3xl font-extrabold">
          {progressPercent}
        </p>
        <div className="flex flex-col gap-2">
          <div className="-mx-2 flex items-end justify-between text-xs font-light">
            <p className="w-1/3 text-start">{currentValue}</p>
            <div className="flex w-1/3 flex-col items-end">
              <p className="mb-1 text-xs font-medium">Target</p>
              <span>{target}</span>
            </div>
          </div>
          <ProgressBar progressPercent={progressPercent} />
          <div className="-mx-2 flex justify-between text-xs font-light">
            <p className="w-1/3 text-start">{progressStatus}</p>
            {!isCompleted && (
              <div className="flex w-1/3 flex-col items-end">
                {/* TODO: match pluralization with number */}
                <span>
                  {daysLeft > 0
                    ? `${daysLeft} days left`
                    : `${Math.abs(daysLeft)} days late`}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-3 pb-3">
        {/* <span className="text-xs">Category</span> */}
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-gray-200/50 px-2 py-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-sm" variant="outline" aria-label={t`Delete goal`}>
                <Trash2Icon size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={5}>
              <div className="space-y-2 pb-4">
                <h3 className="font-medium leading-none">
                  <Trans>Delete goal</Trans>
                </h3>
                <p className="text-muted-foreground text-pretty text-sm">
                  <Trans>Are you sure you want to delete</Trans>{' '}
                  <span className="font-bold">{title}</span>?
                </p>
              </div>
              <div className="grid gap-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    void deleteGoal(id, () =>
                      toast.success(t`Deleted goal: ${title}`),
                    );
                  }}
                >
                  <Trans>Delete</Trans>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Link
            to="/goals/$id"
            params={{ id: shortId }}
            replace
            aria-label={t`Toggle goal details`}
            className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
          >
            <Maximize2Icon size={18} />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
