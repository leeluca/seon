import { lazy, Suspense } from 'react';
import { useQuery, useStatus } from '@powersync/react';
import {
  createLazyFileRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router';
import { AnimatePresence, LayoutGroup } from 'framer-motion';

import GoalCard from '~/components/GoalCard';
import { buttonVariants } from '~/components/ui/button';
import db from '~/lib/database';
import { useUser } from '~/states/userContext';

export const Route = createLazyFileRoute('/_main/goals')({
  component: Goals,
});

const LazyNoGoalsPlaceholder = lazy(
  () => import('../components/NoGoalsPlaceholder'),
);
const NoGoalsPlaceholder = ({ onClick }: { onClick: () => void }) => (
  <Suspense fallback={null}>
    <LazyNoGoalsPlaceholder onClick={onClick} />
  </Suspense>
);

const SyncingPlaceholder = () => (
  <div className="mx-auto flex flex-col items-center">
    <h4 className="mb-2 animate-pulse text-3xl">Syncing your goals...</h4>
  </div>
);

function Goals() {
  const { data: goals } = useQuery(
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
          className={buttonVariants({ variant: 'default', size: 'default' })}
        >
          New Goal
        </Link>
      </div>
      <main
        className="grid grid-flow-row-dense gap-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, auto))',
        }}
      >
        {!goals.length &&
          (user?.useSync ? (
            hasSynced ? (
              <NoGoalsPlaceholder onClick={openNewGoalForm} />
            ) : (
              <SyncingPlaceholder />
            )
          ) : (
            <NoGoalsPlaceholder onClick={openNewGoalForm} />
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
