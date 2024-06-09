import type { HTMLFormMethod } from '@remix-run/router';
import { useEffect, useRef } from 'react';
import { PlusIcon } from '@radix-ui/react-icons';
import { useFetcher } from '@remix-run/react';
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

const NewEntryForm = ({ id }: { id: number }) => {
  const fetcher = useFetcher<typeof action>();
  const entryFetcher = useFetcher({ key: `entries-${id}` });

  const datePickerRef = useRef<{ value: Date | undefined }>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const $form = event.currentTarget;
    const formData = new FormData($form);

    if (datePickerRef.current?.value) {
      formData.set('date', datePickerRef.current.value.toISOString());
    }

    fetcher.submit(formData, {
      method: ($form.getAttribute('method') ?? $form.method) as HTMLFormMethod,
      action: $form.getAttribute('action') ?? $form.action,
    });
  }

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      entryFetcher.load(`/api/entries/${id}`);

      // TODO: add success toast
      formRef.current?.reset();
    }
  }, [fetcher.state, fetcher.data, entryFetcher, id]);

  return (
    <fetcher.Form
      method="POST"
      action={`/dashboard/goals`}
      ref={formRef}
      onSubmit={handleSubmit}
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
              ref={datePickerRef}
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
            />
          </div>
          <Button
            type="submit"
            name="_action"
            value="add-entry"
            disabled={fetcher.state === 'submitting'}
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
export function NewEntryPopover({
  // isOpen,
  // onOpenChange,
  id,
}: NewEntryPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon">
          <PlusIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <NewEntryForm id={id} />
      </PopoverContent>
    </Popover>
  );
}
