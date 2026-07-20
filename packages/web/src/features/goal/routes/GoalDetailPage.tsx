import { useCallback, useState } from 'react';
import * as Sentry from '@sentry/react';
import { useNavigate } from '@tanstack/react-router';

import { UUID_LENGTH } from '~/constants';
import { GoalDetailPanel } from '../components/GoalDetailPanel';

export function GoalDetailPage({ goalId }: { goalId: string }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleReady = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleOpenChangeComplete = (open: boolean) => {
    if (!open) {
      void navigate({ to: '/goals', replace: true });
    }
  };

  return (
    <Sentry.ErrorBoundary
      fallback={
        <GoalDetailPanel.ErrorFallback
          open={isOpen}
          onOpenChange={setIsOpen}
          onOpenChangeComplete={handleOpenChangeComplete}
          onReady={handleReady}
        />
      }
    >
      <GoalDetailPanel
        open={isOpen}
        onOpenChange={setIsOpen}
        onOpenChangeComplete={handleOpenChangeComplete}
        onReady={handleReady}
        selectedGoalId={goalId}
        isShortId={goalId.length < UUID_LENGTH}
      />
    </Sentry.ErrorBoundary>
  );
}
