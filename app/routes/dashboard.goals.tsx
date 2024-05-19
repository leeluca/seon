import type { Entry } from '@prisma/client';
import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import db from '~/.server/db';
import GoalCard from '~/components/GoalCard';


export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries());

  await Promise.all([
    db.entry.create({
      data: {
        goalId: Number(data.id),
        value: Number(data.value),
        date: data.date as string,
        // createdAt
      },
    }),
    db.goal.update({
      where: {
        id: Number(data.id),
      },
      data: {
        currentValue: { increment: Number(data.value) },
      },
    }),
  ]);

  return null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const goals = await db.goal.findMany();
  const selectedId = new URL(request.url).searchParams.get('toggled') || '';

  let entries = [] as Entry[];
  if (selectedId) {
    entries = await db.entry.findMany({
      where: { goalId: parseInt(selectedId, 10) },
    });
  }

  return json({
    goals,
    entries,
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
