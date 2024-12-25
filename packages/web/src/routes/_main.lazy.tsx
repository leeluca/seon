import { createLazyFileRoute, Outlet } from '@tanstack/react-router';

import AppStatusMenu from '~/components/StatusMenu';

export const Route = createLazyFileRoute('/_main')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <div className="px-8 py-4">
        <div className="mx-auto flex max-w-screen-2xl content-center justify-between">
          <AppStatusMenu />
        </div>
      </div>

      <div className="mb-10 px-6 py-4 xl:p-8">
        <div className="m-auto max-w-screen-2xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
