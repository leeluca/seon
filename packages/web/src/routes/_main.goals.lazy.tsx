import type { NoGoalsPlaceholderProps } from '../components/NoGoalsPlaceholder';

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
          className={buttonVariants({ variant: 'default', size: 'default' })}
        >
          <Trans>New Goal</Trans>
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
              <NoGoalsPlaceholder onClick={openNewGoalForm} className='mt-5'/>
            ) : (
              <SyncingPlaceholder />
            )
          ) : (
            <NoGoalsPlaceholder onClick={openNewGoalForm} className='mt-5'/>
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
