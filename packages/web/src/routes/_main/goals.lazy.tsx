import { lazy, Suspense } from 'react';
import { Trans } from '@lingui/react/macro';
import { useStatus, useSuspenseQuery } from '@powersync/react';
import {
  createLazyFileRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { PlusIcon } from 'lucide-react';

import GoalCard from '~/components/GoalCard';
import { buttonVariants } from '~/components/ui/button';
import db from '~/lib/database';
import { useUser } from '~/states/userContext';
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
  const { data: goals } = useSuspenseQuery(
    db.selectFrom('goal').selectAll().orderBy('id asc'),
  );
  const { hasSynced } = useStatus();

  const navigate = useNavigate();
  const openNewGoalForm = () => void navigate({ to: '/goals/new' });
  const user = useUser();

  return (
    <div className="w-full">
      <div className="mb-8 flex justify-between">
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
      </div>
      <main className="grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(300px,auto))] gap-4 sm:grid-cols-[repeat(auto-fit,minmax(400px,auto))] sm:gap-6">
        {!goals.length &&
          (user?.useSync ? (
            hasSynced ? (
              <NoGoalsPlaceholder onClick={openNewGoalForm} className="mt-5" />
            ) : (
              <SyncingPlaceholder />
            )
          ) : (
            <NoGoalsPlaceholder onClick={openNewGoalForm} className="mt-5" />
          ))}
        <LayoutGroup>
          <AnimatePresence>
            {goals.map((goal) => (
              <GoalCard key={goal.id} {...goal} />
            ))}
          </AnimatePresence>
        </LayoutGroup>
        <Outlet />
      </main>
    </div>
  );
}
