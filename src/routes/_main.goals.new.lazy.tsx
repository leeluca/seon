import { useRef } from 'react';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';

import { DatePicker } from '~/components/DatePicker';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export const Route = createLazyFileRoute('/_main/goals/new')({
  component: NewGoalDialog,
});

function NewGoalDialog() {
  const navigate = useNavigate();
  const handleClose = () => {
    void navigate({ from: '/goals/new', to: '/goals', replace: true });
  };

  const startDateRef = useRef<{ value: Date | undefined }>(null);
  const targetDateRef = useRef<{ value: Date | undefined }>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const $form = event.currentTarget;
    const formData = new FormData($form);

    if (startDateRef.current?.value) {
      formData.set('start-date', startDateRef.current.value.toISOString());
    }
    if (targetDateRef.current?.value) {
      formData.set('target-date', targetDateRef.current.value.toISOString());
    }

    // TODO: implement saving new goal to DB
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open: boolean) => {
        open ? () => {} : handleClose();
      }}
    >
      <DialogContent className="sm:max-w-screen-sm">
        <DialogHeader>
          <DialogTitle>Add new goal</DialogTitle>
          <DialogDescription>
            Set up your new goal. You can always edit it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Goal name
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="eg. 'Learn a 1000 Japanese words'"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target" className="text-right">
                Target number
              </Label>
              <Input
                id="target"
                name="target"
                type="number"
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">
                Unit
              </Label>
              <Input
                id="unit"
                name="unit"
                className="col-span-2"
                placeholder="e.g. words"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start-date" className="text-right">
                Start date
              </Label>
              <DatePicker
                id="start-date"
                defaultDate={new Date()}
                ref={startDateRef}
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target-date" className="text-right">
                Target date
              </Label>
              <DatePicker
                id="target-date"
                ref={targetDateRef}
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-value" className="text-right">
                Current value
              </Label>
              <Input
                id="current-value"
                name="current-value"
                type="number"
                className="col-span-2"
                defaultValue="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default NewGoalDialog;
