import type { ReactElement } from 'react';
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
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/types/goal';
import { GoalEditForm } from './GoalEditForm';
import GoalLineGraph from './GoalLineGraph';
import { GoalStatusSummary } from './GoalStatusSummary';

interface SheetProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}
const ErrorFallback = ({ open, onOpenChange }: SheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-full !w-full !max-w-full overflow-y-auto sm:!max-w-3xl">
        <SheetTitle className="text-2xl">
          <div>Goal not found</div>
        </SheetTitle>
      </SheetContent>
    </Sheet>
  );
};

interface GoalDetailPanelProps extends SheetProps {
  child?: ReactElement;
  description?: string;
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

  const isMobile = useViewportStore((state) => state.isMobile);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-full !w-full !max-w-full overflow-y-auto sm:!max-w-3xl">
        {/* FIXME: header should be sticky and always visible regardless of scroll position */}
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <article className="flex min-h-full flex-col gap-1 overflow-x-hidden">
          <section className="relative mt-4 flex min-h-[250px] items-center justify-center overflow-x-hidden">
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
          <GoalStatusSummary
            goalId={id}
            className="mb-2 mt-6 sm:mb-5 sm:mt-3"
          />
          <GoalEditForm goal={selectedGoal} className="my-5 sm:mx-2 sm:my-4" />
        </article>
        <SheetFooter>
          <SheetClose asChild />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

GoalDetailPanel.ErrorFallback = ErrorFallback;
