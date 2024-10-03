import { createRootRoute, Outlet } from '@tanstack/react-router';
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
        <Toaster position="top-right" duration={2500} closeButton />
        <Outlet />
        <TanStackRouterDevtools />
      </SyncProvider>
    </UserProvider>
  );
}
