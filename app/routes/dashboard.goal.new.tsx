import type { ActionFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { Form, useNavigate } from '@remix-run/react';
import db from '~/.server/db';
// import { lightFormat } from 'date-fns';
import { Button } from '~/components/ui/button';
// import { Checkbox } from '~/components/ui/checkbox';
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

type FormEntries = Record<string, string>;

// TODO: implement validation
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries()) as FormEntries;

  await db.goal.create({
    data: {
      title: data.title,
      target: parseInt(data.target, 10),
      unit: data.unit,
      startDate: new Date(data['start-date']),
      targetDate: new Date(data['target-date']),
      currentValue: parseInt(data['current-value'], 10),
    },
  });

  return redirect('..');
}

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
        <Form method="post" replace={true}>
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
            <div className="grid grid-cols-4 items-center gap-4 ">
              <Label htmlFor="start-date" className="text-right">
                Start date
              </Label>
              <Input
                id="start-date"
                name="start-date"
                type="date"
                className="col-span-2"
                //   value={lightFormat(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 ">
              <Label htmlFor="target-date" className="text-right">
                Target date
              </Label>
              <Input
                id="target-date"
                name="target-date"
                type="date"
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
            {/* TODO: only show if current value !== 0 && startDate !== today */}
            {/* TODO: improve label text */}
            {/* <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-number" className="text-right">
                Current value starts today
              </Label>
              <Checkbox id="current-number" className="col-span-2" />
            </div> */}
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewGoalDialog;
