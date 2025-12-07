import { createFileRoute, redirect } from '@tanstack/react-router';

import { isDemo } from '~/utils/demo';

export const Route = createFileRoute('/signup/')({
  beforeLoad({ context }) {
    if (context.authStatus.result || isDemo) {
      return redirect({ to: '/goals' });
    }
  },
});

