import { createLazyFileRoute } from '@tanstack/react-router';

import { GoalDetailPage } from '~/features/goal/routes/GoalDetailPage';

export const Route = createLazyFileRoute('/_main/goals/$id')({
  component: () => {
    const { id: goalId } = Route.useParams();
    return <GoalDetailPage goalId={goalId} />;
  },
});
