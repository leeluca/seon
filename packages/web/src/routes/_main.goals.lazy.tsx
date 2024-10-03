import { useQuery } from '@powersync/react';
import { createLazyFileRoute, Link, Outlet } from '@tanstack/react-router';
import { AnimatePresence, LayoutGroup } from 'framer-motion';

import GoalCard from '~/components/GoalCard';
import { Button } from '~/components/ui/button';
import db from '~/lib/database';

export const Route = createLazyFileRoute('/_main/goals')({
  component: Goals,
});

function Goals() {
  const { data: goals } = useQuery(
    db.selectFrom('goal').selectAll().orderBy('id asc'),
  );

  return (
    <div className="w-full">
      <div className="mb-8 flex justify-between">
        <Link from="/goals" to="/goals/new">
          <Button>New Goal</Button>
        </Link>
      </div>
      <main
        className="grid grid-flow-row-dense gap-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, auto))',
        }}
      >
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
