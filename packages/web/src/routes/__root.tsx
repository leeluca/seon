import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

import { Toaster } from '~/components/ui/sonner';
import { Database } from '~/lib/powersync/AppSchema';
import SyncProvider from '~/states/syncContext';

interface RouterContext {
  user?: Database['user'];
}
export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

function Root() {
  return (
    <SyncProvider>
      <Toaster position="top-right" duration={2500} closeButton />
      <Outlet />
      <TanStackRouterDevtools />
    </SyncProvider>
  );
}
