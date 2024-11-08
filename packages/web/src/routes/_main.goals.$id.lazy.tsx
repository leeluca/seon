import { useState } from 'react';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';

import { GoalDetailPanel } from '~/components/GoalDetailPanel';

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

  const { id: goalShortId } = Route.useParams();

  return (
    <div>
      <GoalDetailPanel
        open={isOpen}
        onOpenChange={() => close()}
        selectedGoalId={goalShortId}
      />
    </div>
  );
}
