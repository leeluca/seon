import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node';
import {
  Outlet,
  ShouldRevalidateFunctionArgs,
  useLoaderData,
} from '@remix-run/react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';

import db from '~/.server/db';
import { checkAuth } from '~/.server/services/auth';
import GoalCard from './components/GoalCard';

export function shouldRevalidate({
  defaultShouldRevalidate,
  formMethod,
}: ShouldRevalidateFunctionArgs) {
  if (!formMethod) {
    return false;
  }

  return defaultShouldRevalidate;
}

export async function action({ request }: ActionFunctionArgs) {
  await checkAuth(request);

  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries());

  const date = new Date(data.date as string);
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const existingEntry = await db.entry.findFirst({
    where: {
      goalId: Number(data.id),
      AND: [
        { date: { gte: startOfDay } },
        { date: { lte: endOfDay } },
      ],
    },
  });

  const entryOperation = existingEntry
    ? db.entry.update({
        where: {
          id: existingEntry.id,
        },
        data: {
          value: Number(data.value),
        },
      })
    : db.entry.create({
        data: {
          goalId: Number(data.id),
          value: Number(data.value),
          date: new Date(data.date as string),
        },
      });

  const goalUpdateOperation = db.goal.update({
    where: {
      id: Number(data.id),
    },
    data: {
      currentValue: { increment: Number(data.value) },
    },
  });

  await db.$transaction([entryOperation, goalUpdateOperation]);
  return json({ success: true });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await checkAuth(request);
  const goals = await db.goal.findMany({
    where: { userId: user.id },
    orderBy: {
      id: 'asc',
    },
  });

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
