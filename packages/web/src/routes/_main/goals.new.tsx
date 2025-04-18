import { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useForm } from '@tanstack/react-form';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { add, startOfDay } from 'date-fns';
import { toast } from 'sonner';

import GoalForm, { GOAL_FORM_ID, type NewGoal } from '~/components/GoalForm';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import useDelayedExecution from '~/hooks/useDelayedExecution';
import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
import { useUserStore } from '~/states/stores/userStore';
import { useViewportStore } from '~/states/stores/viewportStore';
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
  | 'type'
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
    type,
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
        type,
        currentValue: initialValue,
      })
      .executeTakeFirstOrThrow();

    toast.success(<Trans>Sucessfully added goal</Trans>);
    callback?.();
  } catch (error) {
    console.error(error);
    toast.error(<Trans>Failed to add goal</Trans>);
  }
}

function NewGoalDialog() {
  const navigate = useNavigate();
  const userId = useUserStore((state) => state.user.id);
  const { t } = useLingui();

  const [isOpen, setIsOpen] = useState(true);

  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);

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
      type: 'COUNT',
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
      await handleSave(
        {
          ...value,
          title: value.title.trim(),
          unit: value.unit.trim(),
          target: targetValue,
          userId,
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
      <DialogContent
        className="p-4 sm:max-w-screen-sm sm:p-6"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            <Trans>Add new goal</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Set up your new goal. You can always edit it later.</Trans>
          </DialogDescription>
        </DialogHeader>
        <GoalForm
          form={form}
          labelClassName="text-right"
          errorClassName="col-span-3 col-start-2"
          collapseOptionalFields
          autoFocus={!isTouchScreen}
        />
        <DialogFooter className="grid grid-cols-4 justify-items-end gap-4 sm:mt-4">
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
                className={cn('col-start-4', {
                  'cursor-not-allowed': !isSubmitting && isSubmitDisabled,
                })}
              >
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  form={GOAL_FORM_ID}
                  size="lg"
                >
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
