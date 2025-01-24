import { Suspense, useState } from 'react';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';

import { GoalDetailPanel } from '~/components/GoalDetailPanel';
import { UUID_LENGTH } from '~/constants';

export const Route = createLazyFileRoute('/_main/goals/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const close = () => {
    setIsOpen(false);
    setTimeout(() => {
      void navigate({ to: '/goals', replace: true });
    }, 350);
  };

  const { id: goalId } = Route.useParams();

  // FIXME: add error boundary (eg. goal not found)
  return (
    <Suspense>
      <GoalDetailPanel
        open={isOpen}
        onOpenChange={() => close()}
        selectedGoalId={goalId}
        isShortId={goalId.length < UUID_LENGTH}
      />
    </Suspense>
  );
}
