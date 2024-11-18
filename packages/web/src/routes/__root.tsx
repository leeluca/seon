import type { IAuthContext, useUser } from '~/states/userContext';

import React, { Suspense } from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import { Toaster } from '~/components/ui/sonner';
import { TooltipProvider } from '~/components/ui/tooltip';
import OnlineStatusProvider from '~/states/isOnlineContext';
import SyncProvider from '~/states/syncContext';

interface RouterContext {
  user: ReturnType<typeof useUser>;
  authStatus: IAuthContext;
}
export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

const TanStackRouterDevtools =
  process.env.NODE_ENV === 'development'
    ? React.lazy(() =>
        import('@tanstack/router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      )
    : () => null;

function Root() {
  return (
    <SyncProvider>
      <TooltipProvider delayDuration={400}>
        <Toaster
          position="top-right"
          duration={2500}
          closeButton
          className="mt-6"
        />
        <OnlineStatusProvider>
          <Outlet />
        </OnlineStatusProvider>
        <Suspense>
          <TanStackRouterDevtools />
        </Suspense>
      </TooltipProvider>
    </SyncProvider>
  );
}
