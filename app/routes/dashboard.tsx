import GoalCard from '~/components/GoalCard';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { Button } from '~/components/ui/button';
import { Link, Outlet, json, useLoaderData } from '@remix-run/react';
import db from '~/.server/db';

export async function loader() {
  const goals = await db.goal.findMany();
  return json({
    goals,
  });
}

const Dashboard = () => {
  const { goals } = useLoaderData<typeof loader>();

  return (
    <div className="w-full">
      <h1>Dashboard</h1>
      <div className="my-4 flex justify-between">
        <Link to="goal/new">
          <Button>New Goal</Button>
        </Link>
      </div>
      <div
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
      </div>
      <Outlet />
    </div>
  );
};

export default Dashboard;

// w-[clamp(360px,60vw,600px)]
