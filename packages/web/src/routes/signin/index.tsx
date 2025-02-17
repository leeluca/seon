import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/signin/')({
  beforeLoad({ context }) {
    if (context.authStatus.result) {
      return redirect({ to: '/goals' });
    }
  },
});
