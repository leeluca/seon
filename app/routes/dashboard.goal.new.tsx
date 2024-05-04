import { useNavigate } from '@remix-run/react';
// import { lightFormat } from 'date-fns';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
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

const NewGoalDialog = () => {
  const navigate = useNavigate();
  const handleClose = () => {
    navigate('..', { replace: true });
  };

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
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Goal name
            </Label>
            <Input
              id="name"
              placeholder="eg. 'Learn a 1000 Japanese words'"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="target-number" className="text-right">
              Target number
            </Label>
            <Input id="target-number" type="number" className="col-span-2" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unit" className="text-right">
              Unit
            </Label>
            <Input id="unit" className="col-span-2" placeholder="e.g. words" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4 ">
            <Label htmlFor="start-date" className="text-right">
              Start date
            </Label>
            <Input
              id="start-date"
              type="date"
              className="col-span-2"
              //   value={lightFormat(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4 ">
            <Label htmlFor="target-date" className="text-right">
              Target date
            </Label>
            <Input id="target-date" type="date" className="col-span-2" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-number" className="text-right">
              Current value
            </Label>
            <Input
              id="current-number"
              type="number"
              className="col-span-2"
              defaultValue="0"
            />
          </div>
          {/* TODO: only show if current value !== 0 && startDate !== today */}
          {/* TODO: improve label text */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-number" className="text-right">
              Current value starts today
            </Label>
            <Checkbox id="current-number" className="col-span-2" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewGoalDialog;
