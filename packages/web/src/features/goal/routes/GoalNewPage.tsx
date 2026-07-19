import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { useNavigate } from '@tanstack/react-router';

import {
  CreateGoalForm,
  GOAL_FORM_ID,
} from '~/features/goal/components/goalForm';
import { useGoalForm } from '~/features/goal/hooks/useGoalForm';
import { Button } from '~/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/shared/components/ui/drawer';
import { useUserStore } from '~/states/stores/userStore';
import { useViewportStore } from '~/states/stores/viewportStore';

export function GoalNewPage() {
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

  const form = useGoalForm({ mode: 'create', userId, onSuccess: handleClose });

  const isMobile = useViewportStore((state) => state.isMobile);

  if (isMobile) {
    return (
      <form.AppForm>
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
                <Trans>
                  Set up your new goal. You can always edit it later.
                </Trans>
              </DrawerDescription>
            </DrawerHeader>
            <CreateGoalForm
              form={form}
              collapseOptionalFields
              autoFocus={!isTouchScreen}
              formItemClassName="grid-cols-1 items-start gap-y-2 px-4"
            />
            <DrawerFooter className="gap-3 pt-2 [&_button]:w-full">
              <form.SubmitButton form={GOAL_FORM_ID} size="lg" requireDirty>
                <Trans>Create goal</Trans>
              </form.SubmitButton>
              <DrawerClose asChild>
                <Button variant="outline" type="button">
                  <Trans>Cancel</Trans>
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </form.AppForm>
    );
  }

  return (
    <form.AppForm>
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
            <form.SubmitButton
              className="col-start-2"
              form={GOAL_FORM_ID}
              size="lg"
              requireDirty
            >
              <Trans>Create goal</Trans>
            </form.SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form.AppForm>
  );
}
