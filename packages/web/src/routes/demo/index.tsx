import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { isDemo } from '~/utils/demo';

export const Route = createFileRoute('/demo/')({
  beforeLoad({ context }) {
    if (!isDemo) {
      return notFound();
    }
    if (context.isUserInitialized) {
      return redirect({ to: '/goals' });
    }
  },
});
