import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@powersync/react';
import { PlusIcon } from '@radix-ui/react-icons';
import { isSameDay } from 'date-fns';
import { toast } from 'sonner';

import { DatePicker } from '~/components/DatePicker';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import db from '~/lib/database';
import { generateUUIDs } from '~/utils';

function findSameDayEntry(date: Date, entryDate: Date) {
  return isSameDay(date, entryDate);
}

async function handleSubmit(
  event: React.FormEvent<HTMLFormElement>,

  { date }: { date: Date },
  onSubmitCallback: () => void = () => {},
) {
  event.preventDefault();
  //TODO: implement validation
  const $form = event.currentTarget;
  const formData = new FormData($form);
  const data = Object.fromEntries(formData.entries());

  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  try {
    const sameDayEntry = await db
      .selectFrom('entry')
      .selectAll()
      .where((eb) =>
        eb.and([
          eb('goalId', '=', data.goalId as string),
          eb('date', '>=', startOfDay.toISOString()),
          eb('date', '<=', endOfDay.toISOString()),
        ]),
      )
      .executeTakeFirst();

    const entryOperation = sameDayEntry
      ? db
          .updateTable('entry')
          .set({ value: Number(data.entry) })
          .where('id', '=', sameDayEntry.id)
      : (() => {
          const { uuid, shortUuid } = generateUUIDs();
          return db.insertInto('entry').values({
            id: uuid,
            shortId: shortUuid,
            goalId: data.goalId as string,
            value: Number(data.value),
            date: new Date(date).toISOString(),
            createdAt: new Date(date).toISOString(),
            updatedAt: new Date(date).toISOString(),
          });
        })();

    const updatedGoalValue = sameDayEntry
      ? -Number(sameDayEntry.value) + Number(data.value)
      : Number(data.value);
    const goalUpdateOperation = db
      .updateTable('goal')
      .set((eb) => ({
        currentValue: eb('currentValue', '+', updatedGoalValue),
      }))
      .where('id', '=', data.goalId as string);

    await db.transaction().execute(async (tx) => {
      await tx.executeQuery(entryOperation);
      await tx.executeQuery(goalUpdateOperation);
    });

    toast.success('Successfully added entry ');
    onSubmitCallback();
    return true;
  } catch (error) {
    console.error('err', error);
    toast.error('Failed to add entry');
    onSubmitCallback();
    return false;
  }
}

interface NewEntryFormProps {
  id: string;
  onSubmitCallback?: () => void;
}
const NewEntryForm = ({
  id,
  onSubmitCallback = () => {},
}: NewEntryFormProps) => {
  const { data: entries } = useQuery(
    db.selectFrom('entry').selectAll().where('goalId', '=', id),
  );

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  const formRef = useRef<HTMLFormElement>(null);

  const todayEntry = useMemo(
    () =>
      selectedDate &&
      entries.find((entry) =>
        findSameDayEntry(selectedDate, new Date(entry.date)),
      ),
    [selectedDate, entries],
  );

  return (
    <form
      // method="POST"
      // action={formAction}
      ref={formRef}
      onSubmit={(e) => {
        void handleSubmit(
          e,
          { date: selectedDate || new Date() },
          onSubmitCallback,
        );
      }}
    >
      <div className="grid gap-4">
        <h4 className="mb-1 font-medium leading-none">New entry</h4>
        <div className="grid gap-2">
          <Input type="hidden" name="goalId" value={id} />
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="date">Date</Label>
            <DatePicker
              id="date"
              defaultDate={new Date()}
              date={selectedDate}
              setDate={setSelectedDate}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="value">How many?</Label>
            <Input
              id="value"
              name="value"
              className="col-span-2 h-8"
              type="number"
              defaultValue={todayEntry?.value}
              key={selectedDate?.toISOString()}
            />
          </div>
          <Button type="submit" value="add-entry" className="mt-2">
            Submit
          </Button>
        </div>
      </div>
    </form>
  );
};

interface NewEntryPopoverProps {
  isOpen?: boolean;
  onOpenChange?: () => void;
  id: string;
}

export function NewEntryPopover({ id }: NewEntryPopoverProps) {
  const [open, setOpen] = useState(false);

  const togglePopover = () => setOpen((prev) => !prev);

  return (
    <Popover open={open} onOpenChange={togglePopover}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon">
          <PlusIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <NewEntryForm id={id} onSubmitCallback={togglePopover} />
      </PopoverContent>
    </Popover>
  );
}
