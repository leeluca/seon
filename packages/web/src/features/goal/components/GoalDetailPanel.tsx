import {
  useEffect,
  useRef,
  type ComponentProps,
  type ReactElement,
} from 'react';
import { Trans } from '@lingui/react/macro';
import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';

import { GOALS } from '~/constants/query';
import type { GoalType } from '~/features/goal/model';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '~/shared/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/shared/components/ui/sheet';
import { useViewportStore } from '~/states/stores/viewportStore';
import { GoalControls } from './GoalControls';
import { GoalEditForm } from './goalForm';
import GoalLineGraph from './GoalLineGraph';
import { GoalStatusSummary } from './GoalStatusSummary';

const GoalLineGraphErrorFallback = () => (
  <div
    role="alert"
    className="flex flex-col items-center justify-center gap-2 text-center"
  >
    <p className="text-lg font-medium">
      <Trans>Something went wrong</Trans>
    </p>
    <p className="text-muted-foreground">
      <Trans>Please try again later.</Trans>
    </p>
  </div>
);

const GoalLineGraphWithErrorBoundary = (
  props: ComponentProps<typeof GoalLineGraph>,
) => (
  <Sentry.ErrorBoundary
    key={`${props.goalId}-graph-${props.isMobile}`}
    fallback={<GoalLineGraphErrorFallback />}
  >
    <GoalLineGraph {...props} />
  </Sentry.ErrorBoundary>
);

interface SheetProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenChangeComplete: (open: boolean) => void;
  onReady: () => void;
}
const ErrorFallback = ({
  open,
  onOpenChange,
  onOpenChangeComplete,
  onReady,
}: SheetProps) => {
  const isMobile = useViewportStore((state) => state.isMobile);

  useEffect(() => {
    onReady();
  }, [onReady]);

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
      >
        <DrawerContent className="overflow-y-auto">
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
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
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
  onOpenChangeComplete,
  onReady,
  selectedGoalId,
  isShortId,
}: GoalDetailPanelProps) {
  const { data: selectedGoal, error } = useQuery(
    isShortId
      ? GOALS.detailShortId(selectedGoalId)
      : GOALS.detail(selectedGoalId),
  );
  const readyGoalIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedGoal && readyGoalIdRef.current !== selectedGoal.id) {
      readyGoalIdRef.current = selectedGoal.id;
      onReady();
    }
  }, [onReady, selectedGoal]);

  const isMobile = useViewportStore((state) => state.isMobile);

  if (error) {
    throw error;
  }

  if (!selectedGoal) {
    return null;
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
    archivedAt,
  } = selectedGoal;

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
      >
        <DrawerContent className="flex max-h-[98%] flex-col">
          <DrawerHeader>
            <DrawerTitle className="text-2xl">{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <article className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden px-4">
            <section className="relative flex min-h-[365px] items-center justify-center overflow-x-hidden">
              <GoalLineGraphWithErrorBoundary
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
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent className="flex max-h-full w-full! max-w-full! flex-col overflow-hidden sm:max-w-3xl!">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <article className="flex flex-1 [scrollbar-width:thin] [scrollbar-gutter:stable_both-edges] flex-col gap-6 overflow-auto">
          <section className="relative mt-4 flex min-h-[365px] shrink-0 items-center justify-center overflow-x-hidden">
            <GoalLineGraphWithErrorBoundary
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
      </SheetContent>
    </Sheet>
  );
}

GoalDetailPanel.ErrorFallback = ErrorFallback;
