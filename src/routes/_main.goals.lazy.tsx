import { useQuery } from '@powersync/react';
import { createLazyFileRoute, Outlet } from '@tanstack/react-router';
import { AnimatePresence, LayoutGroup } from 'framer-motion';

// import { checkAuth } from '~/.server/services/auth';
import GoalCard from '~/components/GoalCard';
import { db } from '~/contexts/syncContext';

export const Route = createLazyFileRoute('/_main/goals')({
  component: Goals,
});

function Goals() {
  const { data: goals } = useQuery(
    db.selectFrom('goal').selectAll().orderBy('id asc'),
  );

  return (
    <>
      <LayoutGroup>
        <AnimatePresence>
          {goals.map((goal) => (
            <GoalCard key={goal.id} {...goal} />
          ))}
        </AnimatePresence>
      </LayoutGroup>
      <Outlet />
    </>
  );
}
