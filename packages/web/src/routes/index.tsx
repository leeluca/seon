import { createFileRoute, redirect } from '@tanstack/react-router';

import { isDemo } from '~/utils/demo';
import { getHomeRoute } from '~/utils/homeRoute';

export const Route = createFileRoute('/')({
  beforeLoad({ context }) {
    if (context.isUserInitialized) {
      return redirect({ to: getHomeRoute() });
    }
    if (isDemo) {
      return redirect({ to: '/demo' });
    }
  },
});
