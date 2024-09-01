import type { AbstractPowerSyncDatabase } from '@powersync/web';

import {  useMemo, useRef, useState } from 'react';
import { usePowerSync, useQuery } from '@powersync/react';
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
import { db } from '~/contexts/SyncProvider';
import { Database } from '~/lib/powersync/AppSchema';

function findSameDayEntry(date: Date, entryDate: Date) {
  return isSameDay(date, entryDate);
}

async function handleSubmit(
  event: React.FormEvent<HTMLFormElement>,
  dbInstance: AbstractPowerSyncDatabase,
  { date }: { date: Date },
  onSubmitCallback: () => void = () => {},
) {
  event.preventDefault();

  const $form = event.currentTarget;
  const formData = new FormData($form);
  const data = Object.fromEntries(formData.entries());

  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const querySameDateEntry = `
  SELECT * FROM entry
  WHERE goalId = ${Number(data.id)}
  AND date >= '${startOfDay.toISOString()}'
  AND date <= '${endOfDay.toISOString()}'
  LIMIT 1;
`;

  const sameDayEntry = (await dbInstance
    .get(querySameDateEntry)
    .catch(() => null)) as Database['entry'] | null;

  // FIXME: temporary, need to find a better way to generate unique IDs
  const getRandomId = () => Math.floor(Math.random() * 1000000);
  const entryOperation = sameDayEntry
    ? `
    UPDATE entry
    SET value = ${Number(data.value)}
    WHERE id = ${sameDayEntry.id};
  `
    : `
    INSERT INTO entry (id, goalId, value, date)
    VALUES (${getRandomId()}, ${String(data.id)}, ${Number(data.value)}, '${new Date(date).toISOString()}');
  `;

  const updatedGoalValue = sameDayEntry
    ? -Number(sameDayEntry.value) + Number(data.value)
    : Number(data.value);
  const goalUpdateOperation = `UPDATE goal SET currentValue = currentValue + ${updatedGoalValue} WHERE id = ${String(data.id)};`;

  await dbInstance.writeTransaction(async (tx) => {
    await tx.execute(entryOperation);
    await tx.execute(goalUpdateOperation);
  });

  toast.success('Entry added successfully');
  onSubmitCallback();
  return true;
}

interface NewEntryFormProps {
  id: number | string;
  onSubmitCallback?: () => void;
}
const NewEntryForm = ({
  id,
  onSubmitCallback = () => {},
}: NewEntryFormProps) => {
  const powersync = usePowerSync();

  const { data: entries } = useQuery(
    db.selectFrom('entry').selectAll().where('goalId', '=', Number(id)),
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
      // FIXME: temporary, submission handling needs improvement
      onSubmit={async (e) => {
        await handleSubmit(
          e,
          powersync,
          { date: selectedDate },
          onSubmitCallback,
        );
      }}
    >
      <div className="grid gap-4">
        <h4 className="mb-1 font-medium leading-none">New entry</h4>
        <div className="grid gap-2">
          <Input type="hidden" name="id" value={id} />
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
          <Button
            type="submit"
            // name="_action"
            value="add-entry"
            // disabled={fetcher.state === 'submitting'}
            className="mt-2"
          >
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
  id: number | string;
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
