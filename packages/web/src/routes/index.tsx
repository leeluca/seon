import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad({ context }) {
    if (context.isUserInitialized) {
      return redirect({ to: '/goals' });
    }
  },
});
