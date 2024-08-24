import type { HTMLFormMethod } from '@remix-run/router';
import type { loader } from '~/routes/api.entries.$goalId';

import { useEffect, useRef, useState } from 'react';
import { PlusIcon } from '@radix-ui/react-icons';
import { useFetcher } from '@remix-run/react';
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
import { action } from '../route';

function findSameDayEntry(date: Date, entryDate: Date) {
  return isSameDay(date, entryDate);
}

function handleSubmit(
  event: React.FormEvent<HTMLFormElement>,
  fetcher: ReturnType<typeof useFetcher>,
  { date }: { date?: Date },
) {
  event.preventDefault();

  const $form = event.currentTarget;
  const formData = new FormData($form);

  if (date) {
    formData.set('date', date.toISOString());
  }

  fetcher.submit(formData, {
    method: ($form.getAttribute('method') ?? $form.method) as HTMLFormMethod,
    action: $form.getAttribute('action') ?? $form.action,
  });
}

interface NewEntryFormProps {
  id: number;
  onSubmitCallback?: () => void;
}
const NewEntryForm = ({
  id,
  onSubmitCallback = () => {},
}: NewEntryFormProps) => {
  const fetcher = useFetcher<typeof action>();
  const entryFetcher = useFetcher<typeof loader>({ key: `entries-${id}` });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      entryFetcher.load(`/api/entries/${id}`);

      formRef.current?.reset();
      toast.success('Entry added successfully');
      onSubmitCallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data, id]);

  const entries = entryFetcher.data?.entries;

  const todayEntry =
    selectedDate &&
    entries?.find((entry) =>
      findSameDayEntry(selectedDate, new Date(entry.date)),
    );

  return (
    <fetcher.Form
      method="POST"
      action={`/goals`}
      ref={formRef}
      onSubmit={(e) => handleSubmit(e, fetcher, { date: selectedDate })}
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
            name="_action"
            value="add-entry"
            disabled={fetcher.state === 'submitting'}
            className="mt-2"
          >
            Submit
          </Button>
        </div>
      </div>
    </fetcher.Form>
  );
};

interface NewEntryPopoverProps {
  isOpen?: boolean;
  onOpenChange?: () => void;
  id: number;
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
