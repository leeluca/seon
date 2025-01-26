import { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronRightIcon, SaveIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { GOALS } from '~/constants/query';
import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
import type { GoalType } from '~/types/goal';
import { cn } from '~/utils';
import GoalForm, { GOAL_FORM_ID } from './GoalForm';
import { Button } from './ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

async function handleUpdate(
  goalId: string,
  {
    title,
    target,
    unit,
    startDate,
    targetDate,
    initialValue,
    type,
  }: Pick<
    Database['goal'],
    | 'title'
    | 'target'
    | 'unit'
    | 'startDate'
    | 'targetDate'
    | 'initialValue'
    | 'type'
  >,
  callback?: () => void,
) {
  try {
    await db
      .updateTable('goal')
      .set({
        title,
        initialValue,
        target: target,
        unit,
        startDate: startDate,
        targetDate: targetDate,
        updatedAt: new Date().toISOString(),
        type,
      })
      .where('id', '=', goalId)
      .executeTakeFirstOrThrow();

    toast.success(<Trans>Sucessfully updated goal</Trans>);
    callback?.();
  } catch (error) {
    console.error(error);
    toast.error(<Trans>Failed to update goal</Trans>);
  }
}

// FIXME: use common goal interface
interface NewGoal {
  title: string;
  targetValue?: number;
  unit: string;
  startDate: Date;
  targetDate?: Date;
  initialValue: number;
  type: GoalType;
}

interface GoalEditFormProps {
  goal: Database['goal'];
  className?: string;
}
export function GoalEditForm({ goal, className }: GoalEditFormProps) {
  const {
    title,
    target,
    targetDate,
    startDate,
    unit,
    id: goalId,
    updatedAt,
    type,
    initialValue,
  } = goal;
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  const form = useForm<NewGoal>({
    defaultValues: {
      title,
      targetValue: target,
      unit: unit,
      startDate: new Date(startDate),
      targetDate: new Date(targetDate),
      initialValue: initialValue,
      type: type as GoalType,
    },
    validators: {
      onChange({ value }) {
        const { title, targetValue, targetDate } = value;
        if (!title || !targetValue || !targetDate) {
          return t`Missing required fields`;
        }
      },
    },
    onSubmit: async ({ value }) => {
      const { startDate, targetDate, targetValue } = value;
      if (!targetDate || !targetValue) {
        return;
      }
      const stringStartDate = startDate.toISOString();
      const stringTargetDate = targetDate.toISOString();

      await handleUpdate(goalId, {
        ...value,
        target: targetValue,
        startDate: stringStartDate,
        targetDate: stringTargetDate,
      });
      await queryClient.invalidateQueries({ queryKey: GOALS.all.queryKey });
      form.reset();
    },
  });

  return (
    <section className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex h-[3.75rem] items-start justify-between">
          <div className="flex items-start sm:items-center">
            <CollapsibleTrigger asChild className="mr-4 mt-[2px] sm:mt-0">
              <Button id="edit-goal-toggle" size="icon-sm" variant="secondary">
                <ChevronRightIcon
                  size={18}
                  className={`transform transition-transform duration-300 ${
                    isOpen ? 'rotate-90' : 'rotate-0'
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <header>
              <label
                className="text-foreground text-xl font-semibold"
                htmlFor="edit-goal-toggle"
              >
                <Trans>Edit goal</Trans>
              </label>
              <p className="text-muted-foreground mt-1 text-xs">
                <Trans>Last updated at: {format(updatedAt, 'PPp')}</Trans>
              </p>
            </header>
          </div>

          <form.Subscribe
            selector={(state) => [
              state.isSubmitting,
              !state.isDirty || state.isSubmitting,
              !state.isDirty || !state.canSubmit || state.isSubmitting,
            ]}
          >
            {([isSubmitting, isCancelDisabled, isSubmitDisabled]) =>
              isOpen && (
                <div className="animate-fade-in flex gap-2">
                  <div
                    className={cn('flex flex-col items-center gap-1', {
                      'cursor-not-allowed': isCancelDisabled,
                    })}
                  >
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        form.reset();
                      }}
                      aria-label={t`Cancel editing`}
                      disabled={isCancelDisabled}
                    >
                      <XIcon />
                    </Button>
                    <span
                      className={cn('text-xs font-medium', {
                        'text-muted-foreground': isCancelDisabled,
                      })}
                    >
                      <Trans>Cancel</Trans>
                    </span>
                  </div>
                  <div
                    className={cn('flex flex-col items-center gap-1', {
                      'cursor-not-allowed': isSubmitDisabled,
                    })}
                  >
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={t`Save`}
                      form={GOAL_FORM_ID}
                      disabled={isSubmitDisabled || isSubmitting}
                    >
                      <SaveIcon />
                    </Button>
                    <span
                      className={cn('text-xs font-medium', {
                        'text-muted-foreground': isSubmitDisabled,
                      })}
                    >
                      <Trans>Save</Trans>
                    </span>
                  </div>
                </div>
              )
            }
          </form.Subscribe>
        </div>
        <CollapsibleContent>
          <GoalForm
            form={form}
            formItemClassName="grid-cols-1 items-start gap-y-2 px-1"
            className="py-3"
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
