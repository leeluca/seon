import { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useForm } from '@tanstack/react-form';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { add, startOfDay } from 'date-fns';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import useDelayedExecution from '~/apis/hooks/useDelayedExecution';
import GoalForm, { GOAL_FORM_ID, NewGoal } from '~/components/GoalForm';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import db from '~/lib/database';
import { Database } from '~/lib/powersync/AppSchema';
import { useUser } from '~/states/userContext';
import { cn, generateUUIDs } from '~/utils';

export const Route = createFileRoute('/_main/goals/new')({
  component: NewGoalDialog,
});

type GoalSubmitData = Pick<
  Database['goal'],
  | 'title'
  | 'target'
  | 'unit'
  | 'startDate'
  | 'targetDate'
  | 'initialValue'
  | 'userId'
>;

async function handleSave(
  {
    title,
    target,
    unit,
    startDate,
    targetDate,
    initialValue,
    userId,
  }: GoalSubmitData,
  callback?: () => void,
) {
  const { uuid, shortUuid } = generateUUIDs();

  try {
    await db
      .insertInto('goal')
      .values({
        id: uuid,
        shortId: shortUuid as string,
        title,
        initialValue,
        target: target,
        unit,
        userId,
        startDate: startDate,
        targetDate: targetDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .executeTakeFirstOrThrow();

    toast.success(<Trans>Sucessfully added goal</Trans>);
    callback && callback();
  } catch (error) {
    console.error(error);
    toast.error(<Trans>Failed to add goal</Trans>);
  }
}

function NewGoalDialog() {
  const navigate = useNavigate();
  const user = useUser();
  const { t } = useLingui();

  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      void navigate({ from: '/goals/new', to: '/goals', replace: true });
    }, 250);
  };

  const form = useForm<NewGoal>({
    defaultValues: {
      title: '',
      targetValue: 0,
      unit: '',
      startDate: new Date(),
      targetDate: add(startOfDay(new Date()), { months: 1 }),
      initialValue: 0,
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
      if (!targetDate || !user || !targetValue) {
        return;
      }
      const stringStartDate = startDate.toISOString();
      const stringTargetDate = targetDate.toISOString();
      await handleSave(
        {
          ...value,
          title: value.title.trim(),
          unit: value.unit.trim(),
          target: targetValue,
          userId: user.id,
          startDate: stringStartDate,
          targetDate: stringTargetDate,
        },
        handleClose,
      );
    },
  });

  const {
    startTimeout: delayedValidation,
    clearExistingTimeout: clearTimeout,
  } = useDelayedExecution(() => void form.validateAllFields('change'));

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        handleClose();
      }}
    >
      <DialogContent className="sm:max-w-screen-sm">
        <DialogHeader>
          <DialogTitle>Add new goal</DialogTitle>
          <DialogDescription>
            <Trans>Set up your new goal. You can always edit it later.</Trans>
          </DialogDescription>
        </DialogHeader>
        <GoalForm
          form={form}
          labelClassName="text-right"
          errorClassName="col-span-3 col-start-2"
          collapseOptionalFields
        />
        <DialogFooter className="mt-4 grid grid-cols-4 justify-items-end gap-4">
          <form.Subscribe
            selector={(state) => [
              state.isSubmitting,
              !state.isTouched || !state.canSubmit || state.isSubmitting,
            ]}
          >
            {([isSubmitting, isSubmitDisabled]) => (
              <div
                onMouseEnter={delayedValidation}
                onMouseLeave={clearTimeout}
                className={cn('col-start-3', {
                  'cursor-not-allowed': isSubmitDisabled,
                })}
              >
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  form={GOAL_FORM_ID}
                >
                  {isSubmitting && (
                    <LoaderCircleIcon size={18} className="mr-2 animate-spin" />
                  )}
                  <Trans>Create goal</Trans>
                </Button>
              </div>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NewGoalDialog;
