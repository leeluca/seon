import { createRootRouteWithContext } from '@tanstack/react-router';

import { RootLayout, type RouterContext } from '~/app/root';
import ErrorFallback from '~/shared/components/common/ErrorFallback';
import NotFound from '~/shared/components/common/NotFound';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ({ error }) => {
    return <ErrorFallback error={error} />;
  },
  notFoundComponent: () => {
    return <NotFound className="min-h-dvh" />;
  },
});

export type { RouterContext };
