import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import CreateGoalForm, {
  GOAL_FORM_ID,
} from '~/components/goalForm/components/CreateGoalForm';
import { useGoalForm } from '~/components/goalForm/hooks/useGoalForm';
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
import { useUserStore } from '~/states/stores/userStore';
import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';

export const Route = createFileRoute('/_main/goals/new')({
  component: NewGoalDialog,
});

function NewGoalDialog() {
  const navigate = useNavigate();
  const userId = useUserStore((state) => state.user.id);

  const [isOpen, setIsOpen] = useState(true);

  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      void navigate({ from: '/goals/new', to: '/goals', replace: true });
    }, 250);
  };

  const form = useGoalForm({ mode: 'create', userId });

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
        repositionInputs={false}
      >
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="text-left">
            <DrawerTitle>
              <Trans>Add new goal</Trans>
            </DrawerTitle>
            <DrawerDescription>
              <Trans>Set up your new goal. You can always edit it later.</Trans>
            </DrawerDescription>
          </DrawerHeader>
          <CreateGoalForm
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
                // biome-ignore lint/a11y/noStaticElementInteractions: onMouseEnter/onMouseLeave used to trigger validation
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
        <CreateGoalForm
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
              // biome-ignore lint/a11y/noStaticElementInteractions: onMouseEnter/onMouseLeave used to trigger validation
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
