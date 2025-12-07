import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import ErrorFallback from '~/shared/components/common/ErrorFallback';
import NotFound from '~/shared/components/common/NotFound';
import type { AuthStatus } from '~/types/user';

export interface RouterContext {
  authStatus: AuthStatus;
  isUserInitialized: boolean;
}
export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  errorComponent: ({ error }) => {
    return <ErrorFallback error={error} />;
  },
  notFoundComponent: () => {
    return <NotFound className="min-h-dvh" />;
  },
});

function Root() {
  return (
    <>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" />
    </>
  );
}
