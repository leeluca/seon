import { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { GOALS } from '~/constants/query';
import { deleteGoal } from '~/services/goal';
import { cn } from '~/utils';
import { Button } from './ui/button';
import { ResponsivePopover } from './ui/responsive-popover';

interface GoalControlsProps {
  id: string;
  title: string;
  onDeleteSuccess?: () => void;
  className?: string;
}

export function GoalControls({
  id,
  title,
  onDeleteSuccess,
  className,
}: GoalControlsProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [state, setState] = useState({ isOpen: false, isDeleting: false });

  return (
    <div className={cn('flex flex-row gap-3 sm:gap-2', className)}>
      {/* <Button
        variant="outline"
        size="responsive"
        aria-label={t`Archive goal`}
        className="flex-1"
        onClick={() => {
          // TODO: Implement archive logic
          toast.info(t`Archive feature coming soon`);
        }}
      >
        <ArchiveIcon size={18} /> <Trans>Archive Goal</Trans>
      </Button> */}
      <ResponsivePopover
        open={state.isOpen}
        onOpenChange={(isOpen) => setState((prev) => ({ ...prev, isOpen }))}
        trigger={
          <Button
            variant="destructive"
            size="responsive"
            aria-label={t`Delete goal`}
            className="flex-1"
          >
            <Trash2Icon size={18} /> <Trans>Delete Goal</Trans>
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
            disabled={state.isDeleting}
            onClick={() => {
              setState({ isOpen: false, isDeleting: true });
              void deleteGoal(id, () => {
                queryClient.invalidateQueries({
                  queryKey: GOALS.all.queryKey,
                });
                onDeleteSuccess?.();
                setState({ isOpen: false, isDeleting: false });
                toast.success(t`Deleted goal: ${title}`);
              });
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </div>
      </ResponsivePopover>
    </div>
  );
}
