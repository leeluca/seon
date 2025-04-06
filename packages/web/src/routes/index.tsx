import { createFileRoute, redirect } from '@tanstack/react-router';

import { isDemo } from '~/utils/demo';

export const Route = createFileRoute('/')({
  beforeLoad({ context }) {
    if (context.isUserInitialized) {
      return redirect({ to: '/goals' });
    }
    if (isDemo) {
      return redirect({ to: '/demo' });
    }
  },
});
