import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Trans } from '@lingui/react/macro';
import { createLazyFileRoute, Link, Outlet } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import ErrorFallback from '~/components/ErrorFallback';
import { GoalFilter } from '~/components/GoalFilter';
import { GoalsContent } from '~/components/GoalsContent';
import { GoalSorting } from '~/components/GoalSorting';
import { buttonVariants } from '~/components/ui/button';
import { useUserStore } from '~/states/stores/userStore';
import type { GoalFilter as GoalFilterType, GoalSort } from '~/types/goal';
import { cn } from '~/utils';

export const Route = createLazyFileRoute('/_main/goals')({
  component: Layout,
});

function Layout() {
  const [sort, setSort] = useState<GoalSort>(
    () =>
      useUserStore.getState().userPreferences?.defaultGoalSort ??
      'createdAt desc',
  );
  const [filter, setFilter] = useState<GoalFilterType>(
    () => useUserStore.getState().userPreferences?.defaultGoalFilter ?? 'all',
  );

  return (
    <>
      <div className="w-full">
        <header className="mb-8 flex flex-col flex-wrap justify-between gap-6 sm:flex-row sm:items-center">
          <Link
            to="/goals/new"
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'h-12 pl-4 pr-5 sm:h-10',
            )}
          >
            <div className="flex items-center justify-center text-base">
              <PlusIcon size={18} className="mr-2" />
              <Trans>New Goal</Trans>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <GoalFilter filter={filter} setFilter={setFilter} />
            <GoalSorting sort={sort} setSort={setSort} />
          </div>
        </header>
        <ErrorBoundary fallback={<ErrorFallback />}>
          <Suspense>
            <GoalsContent sort={sort} filter={filter} />
          </Suspense>
        </ErrorBoundary>
      </div>
      <Outlet />
    </>
  );
}
