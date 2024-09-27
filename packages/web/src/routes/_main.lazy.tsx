import { createLazyFileRoute, Link, Outlet } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import AppStatusMenu from '~/components/StatusMenu';
import { Button } from '~/components/ui/button';

export const Route = createLazyFileRoute('/_main')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <Toaster position="top-right" duration={2500} closeButton />
      <div className="flex content-center justify-between px-8 py-2">
        <AppStatusMenu />
      </div>

      {/* <hr /> */}

      <div className="p-6 xl:p-8">
        <div className="m-auto max-w-screen-xl">
          <div className="w-full">
            <div className="mb-5 flex justify-between">
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
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
