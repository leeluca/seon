import { Suspense, useState } from 'react';
import * as Sentry from '@sentry/react';
import { useNavigate } from '@tanstack/react-router';

import { UUID_LENGTH } from '~/constants';
import { GoalDetailPanel } from '../components/GoalDetailPanel';

export function GoalDetailPage({ goalId }: { goalId: string }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const close = () => {
    setIsOpen(false);
    setTimeout(() => {
      void navigate({ to: '/goals', replace: true });
    }, 350);
  };

  return (
    <Sentry.ErrorBoundary
      fallback={
        <GoalDetailPanel.ErrorFallback
          open={isOpen}
          onOpenChange={() => close()}
        />
      }
    >
      <Suspense>
        <GoalDetailPanel
          open={isOpen}
          onOpenChange={() => close()}
          selectedGoalId={goalId}
          isShortId={goalId.length < UUID_LENGTH}
        />
      </Suspense>
    </Sentry.ErrorBoundary>
  );
}
