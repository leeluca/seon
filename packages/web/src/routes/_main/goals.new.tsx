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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import useDelayedExecution from '~/hooks/useDelayedExecution';
import { handleSave } from '~/services/goal';
import { useUserStore } from '~/states/stores/userStore';
import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';

export const Route = createFileRoute('/_main/goals/new')({
  component: NewGoalDialog,
});

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
        {
          callback: () => {
            toast.success(<Trans>Sucessfully added goal</Trans>);
            handleClose();
          },
          onError: () => {
            toast.error(<Trans>Failed to add goal</Trans>);
          },
        },
      );
    },
  });

  const {
    startTimeout: delayedValidation,
    clearExistingTimeout: clearTimeout,
  } = useDelayedExecution(() => void form.validateAllFields('change'));

  const isMobile = useViewportStore((state) => state.isMobile);

  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={() => setIsOpen((prev) => !prev)}
        onAnimationEnd={() => handleClose()}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>
              <Trans>Add new goal</Trans>
            </DrawerTitle>
            <DrawerDescription>
              <Trans>Set up your new goal. You can always edit it later.</Trans>
            </DrawerDescription>
          </DrawerHeader>
          <GoalForm
            form={form}
            collapseOptionalFields
            autoFocus={!isTouchScreen}
            formItemClassName="grid-cols-1 items-start gap-y-2 px-4"
          />
          <DrawerFooter className="pt-2">
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
                  className={cn(
                    'flex flex-col items-center gap-3 [&_button]:w-full',
                    {
                      'cursor-not-allowed': !isSubmitting && isSubmitDisabled,
                    },
                  )}
                >
                  <Button
                    type="submit"
                    disabled={isSubmitDisabled}
                    form={GOAL_FORM_ID}
                    size="lg"
                  >
                    <Trans>Create goal</Trans>
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" type="button">
                      <Trans>Cancel</Trans>
                    </Button>
                  </DrawerClose>
                </div>
              )}
            </form.Subscribe>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        handleClose();
      }}
    >
      <DialogContent
        className="p-4 sm:max-w-lg sm:p-6"
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
          errorClassName="col-start-2"
          collapseOptionalFields
          autoFocus={!isTouchScreen}
        />
        <DialogFooter className="grid grid-cols-[auto_1fr] justify-items-end gap-4 sm:mt-4">
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
                className={cn('col-start-2', {
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
