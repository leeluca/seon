import { createLazyFileRoute } from '@tanstack/react-router';

import { MainLayout } from '~/app/root';

export const Route = createLazyFileRoute('/_main')({
  component: MainLayout,
});
