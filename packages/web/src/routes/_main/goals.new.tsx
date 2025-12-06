import { createFileRoute } from '@tanstack/react-router';

import { GoalNewPage } from '~/features/goal/routes/GoalNewPage';

export const Route = createFileRoute('/_main/goals/new')({
  component: GoalNewPage,
});
