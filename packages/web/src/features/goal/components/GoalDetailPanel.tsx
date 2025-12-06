import type { ReactElement } from 'react';
import { Trans } from '@lingui/react/macro';
import { useSuspenseQuery } from '@tanstack/react-query';

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { GOALS } from '~/constants/query';
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/features/goal/model';
import { GoalControls } from './GoalControls';
import { GoalEditForm } from './goalForm';
import GoalLineGraph from './GoalLineGraph';
import { GoalStatusSummary } from './GoalStatusSummary';

interface SheetProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}
const ErrorFallback = ({ open, onOpenChange }: SheetProps) => {
  const isMobile = useViewportStore((state) => state.isMobile);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-full w-full! max-w-full! overflow-y-auto sm:max-w-3xl!">
          <DrawerTitle className="text-2xl">
            <div>
              <Trans>Goal not found</Trans>
            </div>
          </DrawerTitle>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="max-h-full w-full! max-w-full! overflow-y-auto sm:max-w-3xl!"
        side="right"
      >
        <SheetTitle className="text-2xl">
          <div>
            <Trans>Goal not found</Trans>
          </div>
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
    archivedAt,
  } = selectedGoal;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex max-h-full w-full! max-w-full! flex-col rounded-t-none">
          <DrawerHeader>
            <DrawerTitle className="text-2xl">{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <article className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden px-4">
            <section className="relative flex min-h-[365px] items-center justify-center overflow-x-hidden">
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
              className="mt-4 mb-2 sm:mt-3 sm:mb-5"
            />
            <GoalEditForm
              goal={selectedGoal}
              className="my-7 sm:mx-2 sm:my-4"
            />
            <GoalControls
              id={id}
              title={title}
              archivedAt={archivedAt}
              onArchiveToggle={() => onOpenChange(false)}
              onDeleteSuccess={() => onOpenChange(false)}
            />
          </article>
          <DrawerFooter>
            <DrawerClose asChild />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex max-h-full w-full! max-w-full! flex-col overflow-hidden sm:max-w-3xl!">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <article className="flex flex-1 flex-col gap-6 overflow-auto [scrollbar-gutter:stable_both-edges] [scrollbar-width:thin]">
          <section className="relative mt-4 flex min-h-[365px] shrink-0 items-center justify-center overflow-x-hidden">
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
            className="mt-6 mb-2 sm:mt-1 sm:mb-5"
          />
          <GoalEditForm goal={selectedGoal} />
          <GoalControls
            id={id}
            title={title}
            archivedAt={archivedAt}
            onArchiveToggle={() => onOpenChange(false)}
            onDeleteSuccess={() => onOpenChange(false)}
            className="mt-auto"
          />
        </article>
        {/* <SheetFooter>
          <SheetClose asChild />
        </SheetFooter> */}
      </SheetContent>
    </Sheet>
  );
}

GoalDetailPanel.ErrorFallback = ErrorFallback;
