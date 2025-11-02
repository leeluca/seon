import { lazy, Suspense, useCallback, useEffect } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useStatus, useSuspenseQuery } from '@powersync/react';
import { useNavigate } from '@tanstack/react-router';

import GoalCard from '~/components/GoalCard';
import type { NoGoalsPlaceholderProps } from '~/components/NoGoalsPlaceholder';
import { GOALS } from '~/constants/query';
import db from '~/lib/database';
import { updateGoalProgress } from '~/services/progress';
import { useUserStore } from '~/states/stores/userStore';
import type { GoalFilter, GoalSort } from '~/types/goal';

const LazyNoGoalsPlaceholder = lazy(
  () => import('~/components/NoGoalsPlaceholder'),
);

const NoGoalsPlaceholder = ({
  onClick,
  className,
  filter,
}: NoGoalsPlaceholderProps) => (
  <Suspense fallback={null}>
    <LazyNoGoalsPlaceholder
      onClick={onClick}
      className={className}
      filter={filter}
    />
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
  sort: GoalSort;
  filter: GoalFilter;
}

export function GoalsContent({ sort, filter }: GoalsContentProps) {
  const useSync = useUserStore((state) => state.user.useSync);

  const { data: goals, refresh } = useSuspenseQuery(
    GOALS.list(sort, filter).query,
  );
  const navigate = useNavigate();
  const openNewGoalForm = useCallback(
    () => void navigate({ to: '/goals/new' }),
    [navigate],
  );

  const { hasSynced } = useStatus();

  // FIXME: to be removed
  // biome-ignore lint/correctness/useExhaustiveDependencies: should only run once
  useEffect(() => {
    const isNotMigrated = goals.some((goal) => !goal.currentValue);

    if (isNotMigrated) {
      void db.transaction().execute(async (tx) => {
        await Promise.all(goals.map((goal) => updateGoalProgress(goal.id, tx)));
      });
    }
  }, []);

  const showNoGoals = !goals.length;
  const isSyncing = useSync && !hasSynced;

  // FIXME: temporary workaround to refresh the goals list after deleting a goal
  // FIXME: also need to fix issue for archiving/unarchiving goals
  const handleDeleteSuccess = useCallback(() => {
    refresh?.();
  }, [refresh]);

  return (
    <section
      className="grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(300px,auto))] justify-items-center gap-4 sm:grid-cols-[repeat(auto-fit,minmax(400px,auto))] sm:gap-6"
      aria-label={t`Goals list`}
    >
      {showNoGoals &&
        (isSyncing ? (
          <SyncingPlaceholder />
        ) : (
          <NoGoalsPlaceholder
            onClick={openNewGoalForm}
            className="mt-5"
            filter={filter}
          />
        ))}
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          {...goal}
          onDeleteSuccess={handleDeleteSuccess}
        />
      ))}
    </section>
  );
}
