import { createLazyFileRoute, Link, Outlet } from '@tanstack/react-router';

import { Button } from '~/components/ui/button';

export const Route = createLazyFileRoute('/_main')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-6 xl:p-8">
      <div className="m-auto max-w-screen-xl">
        <div className="w-full">
          <h1>Dashboard</h1>
          <div className="my-4 flex justify-between">
            <Link to="goals/new">
              <Button>New Goal</Button>
            </Link>
          </div>
          <main
            className="grid grid-flow-row-dense gap-6"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, auto))',
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
