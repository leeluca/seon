import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { motion } from 'framer-motion';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { LineGraph } from './charts/LineGraph';
import { Button } from './ui/button';
import NewEntryPopover from './NewEntryPopover';
import { getGraphData, mockData } from '~/routes/graph.dashboard';

const MotionCard = motion(Card);
function ProgressBar() {
  const progressBarWidth = '30%';
  return (
    <>
      <div className="flex h-3 w-[calc(100% + 48px)] rounded bg-gray-200 [&>:first-child]:rounded-l [&>:last-child]:rounded-r-md -mx-3">
        <div className="h-3 bg-blue-200" style={{ width: progressBarWidth }} />
      </div>
    </>
  );
}
export default function GoalCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data } = getGraphData(mockData);
  const cardRef = useRef<HTMLDivElement>(null);

  const delayedAutoScroll = () =>
    cardRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

  useEffect(() => {
    const timer = setTimeout(delayedAutoScroll, 300);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  return (
    <MotionCard
      className={`text-center w-full ${isExpanded ? 'col-span-full' : ''}`}
      // whileHover={{ scale: 1.05 }}
      initial={{ scale: 0 }}
      animate={{
        scale: 1,
        transition: {
          delay: 0.15,
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
        <div className="flex justify-between items-center">
          <CardTitle className="">
            <span className="text-2xl">Goal</span>
          </CardTitle>
          <NewEntryPopover />
        </div>
        <CardDescription className="text-xs">Category</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* // TODO: align number without the percent */}
        <p className="font-semibold text-4xl text-center">80%</p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <span>800</span>
            <span>9000</span>
          </div>
          <ProgressBar />
          <div className="flex justify-between text-xs">
            <span>On track</span>
            <span>10 days left</span>
          </div>
        </div>
        {isExpanded && (
          <motion.div className="w-3/5 m-auto">
            <LineGraph data={data} />
          </motion.div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between align-middle px-3 pb-3">
        <span className="text-xs">Category</span>
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          size="sm"
          variant="secondary"
          className='w-6 h-6 p-0'
        >
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </CardFooter>
    </MotionCard>
  );
}
