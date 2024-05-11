import { json } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import db from '~/.server/db';
import GoalCard from '~/components/GoalCard';

export async function loader() {
  const goals = await db.goal.findMany();
  return json({
    goals,
  });
}

const Goals = () => {
  const { goals } = useLoaderData<typeof loader>();
  
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
};

export default Goals;
