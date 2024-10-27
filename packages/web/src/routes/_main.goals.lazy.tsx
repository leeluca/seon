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
import { CDN_URL } from '~/constants';
import db from '~/lib/database';
import { useUser } from '~/states/userContext';
import { cn } from '~/utils';

export const Route = createLazyFileRoute('/_main/goals')({
  component: Goals,
});

const NoGoalsPlaceholder = ({ onClick }: { onClick: () => void }) => (
  <div
    className="animate-delayed-fade-in mx-auto flex flex-col items-center opacity-0"
    onClick={onClick}
    role="button"
    tabIndex={-1}
  >
    <img
      src={`${CDN_URL}/hatching_chick.png`}
      alt="Hatching Chick"
      width="200"
      height="200"
    />
    <h4 className="mb-2 text-3xl">There are no goals</h4>

    <p className="text-muted-foreground text-center">Create your first goal!</p>
  </div>
);

function Goals() {
  const { data: goals } = useQuery(
    db.selectFrom('goal').selectAll().orderBy('id asc'),
  );
  const {
    dataFlowStatus: { downloading, uploading },
    hasSynced,
  } = useStatus();

  const navigate = useNavigate();
  const openNewGoalForm = () => void navigate({ to: '/goals/new' });
  const user = useUser();

  const SyncingPlaceholder = () => (
    <div className="mx-auto flex flex-col items-center">
      <h4 className="mb-2 animate-pulse text-3xl">Syncing your goals...</h4>
    </div>
  );
  return (
    <div className="w-full">
      <div className="mb-8 flex justify-between">
        <Link
          from="/goals"
          to="/goals/new"
          className={cn(
            buttonVariants({ variant: 'default', size: 'default' }),
          )}
        >
          New Goal
        </Link>
      </div>
      <main
        className="grid grid-flow-row-dense gap-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, auto))',
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
