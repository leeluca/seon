import { createLazyFileRoute } from '@tanstack/react-router';

import { TodayPage } from '~/features/today/routes/TodayPage';

export const Route = createLazyFileRoute('/_main/today')({
  component: TodayPage,
});
