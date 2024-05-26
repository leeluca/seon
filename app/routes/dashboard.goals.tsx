import { ActionFunctionArgs, json } from '@remix-run/node';
import {
  Outlet,
  ShouldRevalidateFunctionArgs,
  useLoaderData,
} from '@remix-run/react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import db from '~/.server/db';
import GoalCard from '~/components/GoalCard';

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
  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries());

  await db.$transaction([
    db.entry.create({
      data: {
        goalId: Number(data.id),
        value: Number(data.value),
        date: new Date(data.date as string),
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

  return json({ success: true });
}

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
