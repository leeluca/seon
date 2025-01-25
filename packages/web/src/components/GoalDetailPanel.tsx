import type { ReactElement } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { useSuspenseQuery } from '@powersync/tanstack-react-query';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { GOALS } from '~/constants/query';
import { BREAKPOINTS } from '~/constants/style';
import type { GoalType } from '~/types/goal';
import { GoalEditForm } from './GoalEditForm';
import GoalLineGraph from './GoalLineGraph';
import { GoalStatusSummary } from './GoalStatusSummary';

interface GoalDetailPanelProps {
  child?: ReactElement;
  description?: string;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  selectedGoalId: string;
  isShortId: boolean;
}
export function GoalDetailPanel({
  open,
  onOpenChange,
  selectedGoalId,
  isShortId,
}: GoalDetailPanelProps) {
  const { data: selectedGoal } = useSuspenseQuery(
    isShortId
      ? GOALS.detailShortId(selectedGoalId)
      : GOALS.detail(selectedGoalId),
  );

  const { width, ref } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 200,
  });

  // FIXME: Move to error boundary
  if (!selectedGoal) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="max-h-full !w-full !max-w-full overflow-y-auto sm:!max-w-3xl">
          <div>Goal not found</div>
        </SheetContent>
      </Sheet>
    );
  }

  const {
    title,
    description,
    id,
    targetDate,
    target,
    startDate,
    initialValue,
    type,
  } = selectedGoal;

  const isMobile = !!width && width < BREAKPOINTS.sm;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-full !w-full !max-w-full overflow-y-auto sm:!max-w-3xl">
        {/* FIXME: header should be sticky and always visible regardgless of scroll position */}
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <article className="flex min-h-full flex-col gap-1" ref={ref}>
          <section className="@container relative mt-4 flex aspect-video min-h-[min(20%,25opx)] items-center justify-center">
            <GoalLineGraph
              key={`${id}-graph-${isMobile}`}
              goalId={id}
              targetDate={targetDate}
              target={target}
              startDate={startDate}
              initialValue={initialValue}
              isMobile={isMobile}
              goalType={type as GoalType}
            />
          </section>
          <GoalStatusSummary goalId={id} className="mt-6 mb-2 sm:mt-3 sm:mb-5" />
          <GoalEditForm goal={selectedGoal} className='my-4 sm:mx-2' />
        </article>
        <SheetFooter>
          <SheetClose asChild />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
