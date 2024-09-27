import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

import SyncProvider from '~/states/syncContext';
import UserProvider from '~/states/userContext';

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <UserProvider>
      <SyncProvider>
        <Outlet />
        <TanStackRouterDevtools />
      </SyncProvider>
    </UserProvider>
  );
}
