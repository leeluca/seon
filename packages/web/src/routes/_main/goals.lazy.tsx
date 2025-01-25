import { lazy, Suspense, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { useStatus, useSuspenseQuery } from '@powersync/react';
import {
  createLazyFileRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import GoalCard from '~/components/GoalCard';
import { GoalSorting } from '~/components/GoalSorting';
import { buttonVariants } from '~/components/ui/button';
import { GOALS } from '~/constants/query';
import { useUserStore } from '~/states/stores/userStore';
import type { GoalSort } from '~/types/goal';
import { cn } from '~/utils';
import type { NoGoalsPlaceholderProps } from '../../components/NoGoalsPlaceholder';

export const Route = createLazyFileRoute('/_main/goals')({
  component: Goals,
});

const LazyNoGoalsPlaceholder = lazy(
  () => import('../../components/NoGoalsPlaceholder'),
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

function Goals() {
  const useSync = useUserStore((state) => state.user.useSync);
  const defaultGoalSort = useUserStore(
    (state) => state.userPreferences?.defaultGoalSort,
  );
  const [sort, setSort] = useState<GoalSort>(
    defaultGoalSort ?? 'createdAt desc',
  );

  const { data: goals } = useSuspenseQuery(GOALS.sorted(sort).query);

  // FIXME: causing unnecessary re-renders
  const { hasSynced } = useStatus();

  const navigate = useNavigate();
  const openNewGoalForm = () => void navigate({ to: '/goals/new' });

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-between">
        <Link
          from="/goals"
          to="/goals/new"
          className={cn(
            buttonVariants({ variant: 'default', size: 'lg' }),
            'pl-4 pr-5',
          )}
        >
          <div className="flex items-center justify-center text-base">
            <PlusIcon size={18} className="mr-2" />
            <Trans>New Goal</Trans>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium">Sort by</p>
          <GoalSorting sort={sort} setSort={setSort} />
        </div>
      </div>
      <main className="grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(300px,auto))] justify-items-center gap-4 sm:grid-cols-[repeat(auto-fit,minmax(400px,auto))] sm:gap-6">
        {!goals.length &&
          (useSync ? (
            hasSynced ? (
              <NoGoalsPlaceholder onClick={openNewGoalForm} className="mt-5" />
            ) : (
              <SyncingPlaceholder />
            )
          ) : (
            <NoGoalsPlaceholder onClick={openNewGoalForm} className="mt-5" />
          ))}
        {goals.map((goal) => (
          <GoalCard key={goal.id} {...goal} />
        ))}
        <Outlet />
      </main>
    </div>
  );
}
