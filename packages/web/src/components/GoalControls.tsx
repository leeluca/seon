import { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArchiveIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { GOALS } from '~/constants/query';
import { archiveGoal, deleteGoal, unarchiveGoal } from '~/services/goal';
import { cn } from '~/utils';
import { Button } from './ui/button';
import { ResponsivePopover } from './ui/responsive-popover';

interface GoalControlsProps {
  id: string;
  title: string;
  archivedAt: string | null;
  onDeleteSuccess?: () => void;
  onArchiveToggle?: (isArchived: boolean) => void;
  className?: string;
}

export function GoalControls({
  id,
  title,
  archivedAt,
  onDeleteSuccess,
  onArchiveToggle,
  className,
}: GoalControlsProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [state, setState] = useState({
    isOpen: false,
  });

  const isArchived = Boolean(archivedAt);

  const invalidateGoalQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: GOALS.all.queryKey });
  };

  // Mutations using TanStack Query
  const archiveMutation = useMutation({
    mutationFn: ({ id, unarchive }: { id: string; unarchive: boolean }) =>
      unarchive ? unarchiveGoal(id) : archiveGoal(id),
    onSuccess: async (_data, variables) => {
      void invalidateGoalQueries();
      onArchiveToggle?.(!variables.unarchive);
      toast.success(
        variables.unarchive
          ? t`Unarchived goal: ${title}`
          : t`Archived goal: ${title}`,
      );
    },
    onError: (_err, variables) => {
      toast.error(
        variables.unarchive
          ? t`Failed to unarchive ${title}`
          : t`Failed to archive ${title}`,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: async () => {
      void invalidateGoalQueries();
      onDeleteSuccess?.();
      setState((prev) => ({ ...prev, isOpen: false }));
      toast.success(t`Deleted goal: ${title}`);
    },
    onError: () => {
      toast.error(t`Failed to delete ${title}`);
    },
  });

  const isMutating = archiveMutation.isPending || deleteMutation.isPending;

  const handleArchiveToggle = () => {
    archiveMutation.mutate({ id, unarchive: isArchived });
  };

  return (
    <div className={cn('flex flex-row gap-3 sm:gap-2', className)}>
      <Button
        variant="outline"
        size="responsive"
        className="flex-1"
        disabled={isMutating}
        onClick={handleArchiveToggle}
      >
        <ArchiveIcon size={18} />
        {isArchived ? (
          <Trans>Unarchive goal</Trans>
        ) : (
          <Trans>Archive goal</Trans>
        )}
      </Button>
      <ResponsivePopover
        open={state.isOpen}
        onOpenChange={(isOpen) => setState((prev) => ({ ...prev, isOpen }))}
        trigger={
          <Button
            variant="destructive"
            size="responsive"
            aria-label={t`Delete goal`}
            className="flex-1"
            disabled={isMutating}
          >
            <Trash2Icon size={18} /> <Trans>Delete goal</Trans>
          </Button>
        }
        drawerTitle={t`Delete goal`}
        contentProps={{ sideOffset: 5 }}
      >
        <div className="pb-6 sm:space-y-2 sm:pb-4">
          <h3 className="hidden leading-none font-medium sm:block">
            <Trans>Delete goal</Trans>
          </h3>
          <p className="text-muted-foreground text-sm text-pretty">
            <Trans>
              Are you sure you want to delete{' '}
              <span className="font-bold">{title}</span>?
            </Trans>
          </p>
        </div>
        <div className="grid gap-4">
          <Button
            variant="destructive"
            size="responsive"
            disabled={isMutating}
            onClick={() => {
              deleteMutation.mutate(id);
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </div>
      </ResponsivePopover>
    </div>
  );
}
