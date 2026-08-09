import { createFileRoute, redirect } from '@tanstack/react-router';

import { isDemo } from '~/utils/demo';
import { getHomeRoute } from '~/utils/homeRoute';

export const Route = createFileRoute('/signin/')({
  beforeLoad({ context }) {
    if (context.authStatus.result || isDemo) {
      return redirect({ to: getHomeRoute() });
    }
  },
});
