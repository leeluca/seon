import { Suspense, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import * as Sentry from '@sentry/react';
import { createLazyFileRoute, Link, Outlet } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import ErrorFallback from '~/components/ErrorFallback';
import { GoalFilter } from '~/components/GoalFilter';
import { GoalsContent } from '~/components/GoalsContent';
import { GoalSorting } from '~/components/GoalSorting';
import { buttonVariants } from '~/components/ui/button';
import { ResponsiveTooltip } from '~/components/ui/responsive-tooltip';
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
        <h1 className="sr-only">
          <Trans>Goals</Trans>
        </h1>
        <div
          className="mb-8 flex flex-col flex-wrap justify-between gap-6 sm:flex-row sm:items-center"
          role="toolbar"
          aria-label="Goal management controls"
        >
          <Link
            to="/goals/new"
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'hidden h-12 pr-5 pl-4 sm:flex sm:h-10',
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
        </div>
        <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
          <Suspense>
            <GoalsContent sort={sort} filter={filter} />
          </Suspense>
        </Sentry.ErrorBoundary>
      </div>
      <Outlet />

      {/* Floating button for small screens */}
      <div className="fixed right-4 bottom-14 z-20 sm:hidden">
        <ResponsiveTooltip content={<Trans>Add new goal</Trans>} side="top">
          <Link
            to="/goals/new"
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'flex h-16 w-16 rounded-full p-0 shadow-xl [&_svg]:size-7!',
            )}
            aria-label={t`Add new goal`}
          >
            <PlusIcon />
          </Link>
        </ResponsiveTooltip>
      </div>
    </>
  );
}
