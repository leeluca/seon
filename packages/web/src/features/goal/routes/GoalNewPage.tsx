import { useEffect, useState } from 'react';
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
import { useViewportStore } from '~/states/stores/viewportStore';

export function GoalNewPage() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);

  const handleOpenChangeComplete = (open: boolean) => {
    if (!open) {
      void navigate({ from: '/goals/new', to: '/goals', replace: true });
    }
  };

  const form = useGoalForm({
    mode: 'create',
    onSuccess: () => setIsOpen(false),
  });

  const isMobile = useViewportStore((state) => state.isMobile);

  if (isMobile) {
    return (
      <form.AppForm>
        <Drawer
          open={isOpen}
          onOpenChange={setIsOpen}
          onOpenChangeComplete={handleOpenChangeComplete}
        >
          <DrawerContent className="max-h-[97%] px-4 pb-6">
            <DrawerHeader className="text-left!">
              <DrawerTitle>
                <Trans>Add new goal</Trans>
              </DrawerTitle>
              <DrawerDescription>
                <Trans>
                  Set up your new goal. You can always edit it later.
                </Trans>
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <CreateGoalForm
                form={form}
                collapseOptionalFields
                autoFocus={!isTouchScreen}
                formItemClassName="grid-cols-1 items-start gap-y-2 px-4"
              />
            </div>
            <DrawerFooter className="gap-3 pt-2 [&_button]:w-full">
              <form.SubmitButton form={GOAL_FORM_ID} size="lg" requireDirty>
                <Trans>Create goal</Trans>
              </form.SubmitButton>
              <DrawerClose render={<Button variant="outline" type="button" />}>
                <Trans>Cancel</Trans>
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
        onOpenChange={setIsOpen}
        onOpenChangeComplete={handleOpenChangeComplete}
      >
        <DialogContent className="p-4 sm:max-w-lg sm:p-6" initialFocus={false}>
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
