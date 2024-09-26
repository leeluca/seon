import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

import { Toaster } from '~/components/ui/sonner';
import SyncProvider from '~/states/syncContext';
import UserProvider from '~/states/userContext';

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <UserProvider>
      <SyncProvider>
        <div className="flex content-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Toaster position="top-right" duration={2500} closeButton />
            <Link to="/" className="[&.active]:font-bold">
              Home
            </Link>
            <Link to="/about" className="[&.active]:font-bold">
              About
            </Link>
          </div>
        </div>

        <hr />
        <Outlet />
        <TanStackRouterDevtools />
      </SyncProvider>
    </UserProvider>
  );
}
