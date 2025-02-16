import { lazy, Suspense } from 'react';
import { Trans } from '@lingui/react/macro';
import { useStatus } from '@powersync/react';

import GoalCard from '~/components/GoalCard';
import type { NoGoalsPlaceholderProps } from '~/components/NoGoalsPlaceholder';
import type { Database } from '~/lib/powersync/AppSchema';

const LazyNoGoalsPlaceholder = lazy(
  () => import('~/components/NoGoalsPlaceholder'),
);

const NoGoalsPlaceholder = ({
  onClick,
  className,
}: NoGoalsPlaceholderProps) => (
  <Suspense fallback={null}>
    <LazyNoGoalsPlaceholder onClick={onClick} className={className} />
  </Suspense>
);

const SyncingPlaceholder = () => (
  <div className="mx-auto flex flex-col items-center">
    <h4 className="mb-2 animate-pulse text-3xl">
      <Trans>Syncing your goals...</Trans>
    </h4>
  </div>
);

export interface GoalsContentProps {
  goals: Database['goal'][];
  openNewGoalForm: () => void;
  useSync: boolean;
}

export function GoalsContent({
  goals,
  openNewGoalForm,
  useSync,
}: GoalsContentProps) {
  const { hasSynced } = useStatus();

  const showNoGoals = !goals.length;
  const isSyncing = useSync && !hasSynced;

  return (
    <main className="grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(300px,auto))] justify-items-center gap-4 sm:grid-cols-[repeat(auto-fit,minmax(400px,auto))] sm:gap-6">
      {showNoGoals &&
        (isSyncing ? (
          <SyncingPlaceholder />
        ) : (
          <NoGoalsPlaceholder onClick={openNewGoalForm} className="mt-5" />
        ))}
      {goals.map((goal) => (
        <GoalCard key={goal.id} {...goal} />
      ))}
    </main>
  );
}
