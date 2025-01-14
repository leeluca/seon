import { useState, type ReactElement } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { Trans, useLingui } from '@lingui/react/macro';
import { useSuspenseQuery } from '@powersync/react';
import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { ChevronRightIcon, SaveIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { BREAKPOINTS } from '~/constants/style';
import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
import { cn } from '~/utils';
import GoalForm, { GOAL_FORM_ID } from './GoalForm';
import GoalLineGraph from './GoalLineGraph';
import { Button } from './ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

interface GoalDetailPanelProps {
  child?: ReactElement;
  description?: string;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  selectedGoalId: string;
}
export function GoalDetailPanel({
  open,
  onOpenChange,
  selectedGoalId,
}: GoalDetailPanelProps) {
  const {
    data: [selectedGoal],
  } = useSuspenseQuery(
    db
      .selectFrom('goal')
      .selectAll()
      .where('shortId', '=', selectedGoalId)
      .limit(1),
  );

  const {
    title,
    description,
    id,
    targetDate,
    target,
    startDate,
    initialValue,
  } = selectedGoal;

  const { width, ref } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 200,
  });
  const isMobile = !!width && width < BREAKPOINTS.sm;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-full !w-full !max-w-full overflow-y-auto sm:!max-w-3xl">
        {/* FIXME: header should be sticky and always visible regardgless of scroll position */}
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <article className="flex min-h-full flex-col gap-1" ref={ref}>
          <section className="relative mt-4 flex aspect-video min-h-[min(20%,25opx)] items-center justify-center">
            <GoalLineGraph
              key={`${id}-graph-${isMobile}`}
              goalId={id}
              targetDate={targetDate}
              target={target}
              startDate={startDate}
              initialValue={initialValue}
              isMobile={isMobile}
            />
          </section>
          <GoalEditForm goal={selectedGoal} />
        </article>
        <SheetFooter>
          <SheetClose asChild />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

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
        initialValue,
        target: target,
        unit,
        startDate: startDate,
        targetDate: targetDate,
        updatedAt: new Date().toISOString(),
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

function GoalEditForm({ goal }: { goal: Database['goal'] }) {
  const {
    title,
    target,
    targetDate,
    startDate,
    unit,
    id: goalId,
    updatedAt,
    type,
  } = goal;
  const { t } = useLingui();

  const [isOpen, setIsOpen] = useState(true);

  const form = useForm<NewGoal>({
    defaultValues: {
      title,
      targetValue: target,
      unit: unit,
      startDate: new Date(startDate),
      targetDate: new Date(targetDate),
      initialValue: 0,
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
      form.reset();
    },
  });

  return (
    <section className="my-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex h-[3.75rem] items-start justify-between">
          <div className="flex items-center">
            <CollapsibleTrigger asChild className="mr-4">
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
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
