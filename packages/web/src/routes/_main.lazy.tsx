import { createLazyFileRoute, Outlet } from '@tanstack/react-router';

import AppStatusMenu from '~/components/StatusMenu';

export const Route = createLazyFileRoute('/_main')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <div className="px-8 py-4">
        <div className="mx-auto flex max-w-screen-xl content-center justify-between">
          <AppStatusMenu />
        </div>
      </div>

      <div className="px-6 py-4 mb-10 xl:p-8">
        <div className="m-auto max-w-screen-xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
