import {
  useEffect,
  useRef,
  type ComponentProps,
  type ReactElement,
} from 'react';
import { Trans } from '@lingui/react/macro';
import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDownIcon } from 'lucide-react';

import { GOALS } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import { EntryHeatmap } from '~/features/entry/components/EntryHeatmap';
import { EntryHistory } from '~/features/entry/components/EntryHistory';
import type { GoalType } from '~/features/goal/model';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/shared/components/ui/collapsible';
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
import { GoalDetailStats } from './GoalDetailStats';
import { GoalEditForm } from './goalForm';
import GoalLineGraph from './GoalLineGraph';

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

interface GoalDetailBodyProps {
  goal: NonNullable<Database['goal']>;
  isMobile: boolean;
  onClose: () => void;
}

function GoalDetailBody({ goal, isMobile, onClose }: GoalDetailBodyProps) {
  return (
    <>
      <GoalDetailStats goal={goal} />
      <section className="relative flex min-h-[365px] shrink-0 items-center justify-center overflow-x-hidden">
        <GoalLineGraphWithErrorBoundary
          goalId={goal.id}
          targetDate={goal.targetDate}
          target={goal.target}
          startDate={goal.startDate}
          initialValue={goal.initialValue}
          isMobile={isMobile}
          goalType={goal.type as GoalType}
        />
      </section>
      <EntryHeatmap goal={goal} />
      <EntryHistory goalId={goal.id} goalType={goal.type} />
      <Collapsible>
        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-2 py-2 text-xs font-semibold tracking-widest uppercase transition-colors">
          <Trans>Edit goal</Trans>
          <ChevronsUpDownIcon size={14} aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <GoalEditForm goal={goal} className="my-4" />
        </CollapsibleContent>
      </Collapsible>
      <GoalControls
        id={goal.id}
        title={goal.title}
        archivedAt={goal.archivedAt}
        onArchiveToggle={onClose}
        onDeleteSuccess={onClose}
      />
    </>
  );
}

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
        className="max-h-full w-full! max-w-full! overflow-y-auto p-6 sm:max-w-3xl!"
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

  const { title, description } = selectedGoal;

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
      >
        <DrawerContent className="flex max-h-[98%] flex-col">
          <DrawerHeader>
            <DrawerTitle className="pb-2 text-2xl">{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <article className="flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-4 pb-4">
            <GoalDetailBody
              goal={selectedGoal}
              isMobile={isMobile}
              onClose={() => onOpenChange(false)}
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
        <SheetHeader className="mb-2">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <article className="flex flex-1 scrollbar-thin scrollbar-gutter-both flex-col gap-6 overflow-auto px-6 pb-6">
          <GoalDetailBody
            goal={selectedGoal}
            isMobile={isMobile}
            onClose={() => onOpenChange(false)}
          />
        </article>
      </SheetContent>
    </Sheet>
  );
}

GoalDetailPanel.ErrorFallback = ErrorFallback;
