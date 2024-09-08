import { createLazyFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/')({
  component: Index,
});

// TODO: rethink if redirecting to /goals is the best approach (slight delay)
function Index() {
  return <Navigate to="/goals" />;
}
