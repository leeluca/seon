import type { Database } from '~/lib/powersync/AppSchema';

import { useRef, useState } from 'react';
import { differenceInCalendarDays, eachDayOfInterval } from 'date-fns';
// import { motion } from 'framer-motion';
import { Maximize2Icon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import GoalLineGraph from '~/components/GoalLineGraph';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import db from '~/lib/database';
import { GoalDetailPanel } from './GoalDetailPanel';
import { NewEntryPopover } from './NewEntryPopover';
import { Button } from './ui/button';
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

async function deleteGoal(goalId: string, callback?: () => void) {
  await db.deleteFrom('goal').where('id', '=', goalId).execute();
  callback && callback();
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
}: Database['goal']) {
  const cardRef = useRef<HTMLDivElement>(null);

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
          <CardTitle className="mr-2 w-60 grow text-center text-2xl">
            {title}
          </CardTitle>
          <NewEntryPopover id={id} />
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
      <CardFooter className="px-3 pb-3">
        {/* <span className="text-xs">Category</span> */}
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-gray-200/50 px-2 py-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-small" variant="ghost">
                <Button size="icon-small" variant="outline">
                  <Trash2Icon size={18} />
                </Button>
              </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={5}>
              <div className="space-y-2 pb-4">
                <h3 className="font-medium leading-none">Delete goal</h3>
                <p className="text-muted-foreground text-pretty text-sm">
                  Are you sure you want to delete{' '}
                  <span className="font-bold">{title}</span>?
                </p>
              </div>
              <div className="grid gap-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    void deleteGoal(id, () =>
                      toast.success(`Deleted goal: ${title}`),
                    );
                  }}
                >
                  Delete
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="icon-small"
            variant="outline"
            onClick={() => setSidePanelOpen(true)}
          >
            <Maximize2Icon size={18} />
          </Button>
        </div>
      </CardFooter>
      <GoalDetailPanel
        title={title}
        graphComponent={GraphComponent}
        open={sidePanelOpen}
        onOpenChange={setSidePanelOpen}
      />
    </Card>
  );
}
