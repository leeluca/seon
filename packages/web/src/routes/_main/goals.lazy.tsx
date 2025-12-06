import { createLazyFileRoute, Outlet } from '@tanstack/react-router';

import { GoalsPage } from '~/features/goal/routes/GoalsPage';

export const Route = createLazyFileRoute('/_main/goals')({
  component: () => (
    <>
      <GoalsPage />
      <Outlet />
    </>
  ),
});
