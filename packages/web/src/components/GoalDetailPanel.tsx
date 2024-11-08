import type { Database } from '~/lib/powersync/AppSchema';
import type { ReactElement } from 'react';

import { useQuery } from '@powersync/react';
import { useForm } from '@tanstack/react-form';
// import { format } from 'date-fns';
import { SaveIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  // SheetTrigger,
} from '~/components/ui/sheet';
import db from '~/lib/database';
import { cn } from '~/utils';
import GoalForm, { GOAL_FORM_ID } from './GoalForm';
import { Button } from './ui/button';

async function handleUpdate(
  goalId: string,
  {
    title,
    target,
    unit,
    startDate,
    targetDate,
    initialValue,
  }: Pick<
    Database['goal'],
    'title' | 'target' | 'unit' | 'startDate' | 'targetDate' | 'initialValue'
  >,
  callback?: () => void,
) {
  try {
    await db
      .updateTable('goal')
      .set({
        title,
        currentValue: initialValue,
        initialValue,
        target: target,
        unit,
        startDate: startDate,
        targetDate: targetDate,
        updatedAt: new Date().toISOString(),
      })
      .where('id', '=', goalId)
      .executeTakeFirstOrThrow();

    toast.success('Sucessfully updated goal');
    callback && callback();
  } catch (error) {
    console.error(error);
    toast.error('Failed to update goal');
  }
}

// FIXME: fix types
// TODO: move outside of goal component and have a single instance of this component
interface GoalDetailPanelProps {
  child?: ReactElement;
  description?: string;
  // FIXME: temporary, won't receive as prop
  // graphComponent: JSX.Element;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  selectedGoalId: string;
  // goal: Database['goal'];
}
export function GoalDetailPanel({
  open,
  onOpenChange,
  // description,
  // graphComponent,
  selectedGoalId,
  // goal,
}: GoalDetailPanelProps) {
  // const { selectedGoal } = useSelectedGoal();

  interface NewGoal {
    title: string;
    targetValue?: number;
    unit: string;
    startDate: Date;
    targetDate?: Date;
    initialValue: number;
  }

  const {
    data: [selectedGoal],
    isLoading,
  } = useQuery(
    db
      .selectFrom('goal')
      .selectAll()
      .where('shortId', '=', selectedGoalId)
      .limit(1),
  );

  const {
    title,
    target,
    targetDate,
    startDate,
    description,
    unit,
    id: goalId,
  } = selectedGoal || {};

  const form = useForm<NewGoal>({
    defaultValues: {
      title,
      targetValue: target,
      unit: unit,
      startDate: startDate ? new Date(startDate) : new Date(),
      targetDate: targetDate ? new Date(targetDate) : new Date(),
      // startDate: new Date(),
      // targetDate: new Date(),

      initialValue: 0,
    },
    validators: {
      onChange({ value }) {
        const { title, targetValue, targetDate } = value;
        if (!title || !targetValue || !targetDate) {
          return 'Missing required fields';
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
      form.reset();
    },
  });

  if (!selectedGoal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* <SheetTrigger asChild>{child}</SheetTrigger> */}
      <SheetContent className="!w-full !max-w-full sm:!max-w-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {/* {graphComponent} */}
        <section className="my-6">
          <div className="flex items-center justify-end">
            <p className="text-muted-foreground mr-2 text-xs">
              {/* Last updated at: {format(updatedAt, 'PPpp')} */}
            </p>
            <form.Subscribe
              selector={(state) => [
                state.isSubmitting,
                !state.isDirty || state.isSubmitting,
                !state.isDirty || !state.canSubmit || state.isSubmitting,
              ]}
            >
              {([isSubmitting, isCancelDisabled, isSubmitDisabled]) => (
                <div className="flex gap-2">
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
                      aria-label="Cancel editing"
                      disabled={isCancelDisabled}
                    >
                      <XIcon />
                    </Button>
                    <span
                      className={cn('text-xs font-medium', {
                        'text-muted-foreground': isCancelDisabled,
                      })}
                    >
                      Cancel
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
                      aria-label="Save"
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
                      Save
                    </span>
                  </div>
                </div>
              )}
            </form.Subscribe>
          </div>
          <GoalForm form={form} formItemClassName="block" />
        </section>
        <SheetFooter>
          <SheetClose asChild></SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
