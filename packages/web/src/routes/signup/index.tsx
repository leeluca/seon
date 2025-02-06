import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/signup/')({
  beforeLoad({ context }) {
    if (context.authStatus.result) {
      return redirect({ to: '/goals' });
    }
  },
});
