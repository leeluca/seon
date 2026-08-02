import { useEffect, useRef } from 'react';
import { Trans } from '@lingui/react/macro';
import { format } from 'date-fns';
import { SaveIcon, XIcon } from 'lucide-react';

import type { Database } from '~/data/db/AppSchema';
import { Button } from '~/shared/components/ui/button';
import { cn } from '~/utils';
import CreateGoalForm from './CreateGoalForm';
import { useGoalForm } from '../../hooks/useGoalForm';
import { GOAL_FORM_ID } from '../../model';

interface GoalEditFormProps {
  goal: Database['goal'];
  className?: string;
}
export function GoalEditForm({ goal, className }: GoalEditFormProps) {
  const { updatedAt } = goal;
  const contentRef = useRef<HTMLElement | null>(null);

  const form = useGoalForm({ mode: 'edit', goal });

  // NOTE: the parent collapsible mounts this on expand — scroll it into view
  useEffect(() => {
    // Wait for the expand animation to end
    const id = window.setTimeout(() => {
      contentRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 210);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <form.AppForm>
      <section ref={contentRef} className={cn('scroll-mt-24', className)}>
        <p className="text-muted-foreground px-1 text-xs">
          <Trans>Last update: {format(updatedAt, 'PPp')}</Trans>
        </p>
        <CreateGoalForm
          form={form}
          formItemClassName="grid-cols-1 items-start gap-y-2 px-1"
          className="py-3"
        />
        <form.Subscribe
          selector={(state) => [
            state.isSubmitting,
            !state.isDirty || state.isSubmitting,
            !state.isDirty || !state.canSubmit || state.isSubmitting,
          ]}
        >
          {([isSubmitting, isCancelDisabled, isSubmitDisabled]) => (
            <div className="flex justify-end gap-2 px-1 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                }}
                disabled={isCancelDisabled}
              >
                <XIcon />
                <Trans>Cancel</Trans>
              </Button>
              <Button
                type="submit"
                form={GOAL_FORM_ID}
                disabled={isSubmitDisabled || isSubmitting}
              >
                <SaveIcon />
                <Trans>Save</Trans>
              </Button>
            </div>
          )}
        </form.Subscribe>
      </section>
    </form.AppForm>
  );
}
