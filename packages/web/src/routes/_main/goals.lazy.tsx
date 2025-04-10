import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { useSuspenseQuery } from '@powersync/react';
import {
  createLazyFileRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import {
  GoalCompletionFilterControl,
  type GoalCompletionFilter,
} from '~/components/GoalCompletionFilterControl';
import { GoalsContent } from '~/components/GoalsContent';
import { GoalSorting } from '~/components/GoalSorting';
import { buttonVariants } from '~/components/ui/button';
import { GOALS } from '~/constants/query';
import { useUserStore } from '~/states/stores/userStore';
import type { GoalSort } from '~/types/goal';
import { cn } from '~/utils';

export const Route = createLazyFileRoute('/_main/goals')({
  component: Goals,
});

function Goals() {
  const useSync = useUserStore((state) => state.user.useSync);
  const defaultGoalSort = useUserStore(
    (state) => state.userPreferences?.defaultGoalSort,
  );
  const [sort, setSort] = useState<GoalSort>(
    defaultGoalSort ?? 'createdAt desc',
  );
  const [filter, setFilter] = useState<GoalCompletionFilter>('all');

  const { data: goals } = useSuspenseQuery(GOALS.list(sort, filter).query);

  const navigate = useNavigate();
  const openNewGoalForm = () => void navigate({ to: '/goals/new' });

  return (
    <>
      <div className="w-full">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium">
                <Trans>Filter by</Trans>
              </p>
              <GoalCompletionFilterControl filter={filter} setFilter={setFilter} />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium">
                <Trans>Sort by</Trans>
              </p>
              <GoalSorting sort={sort} setSort={setSort} />
            </div>
          </div>
        </div>
        <GoalsContent
          goals={goals}
          useSync={!!useSync}
          openNewGoalForm={openNewGoalForm}
        />
      </div>
      <Outlet />
    </>
  );
}
