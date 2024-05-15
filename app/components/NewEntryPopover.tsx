import { useEffect, useRef, useTransition } from 'react';
import { PlusIcon } from '@radix-ui/react-icons';
import { Form, useNavigation } from '@remix-run/react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';

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
  const navigation = useNavigation();

  const formRef = useRef<HTMLFormElement>(null);
  const isAdding =
    navigation.state === 'submitting' &&
    navigation.formData?.get('_action') === 'add-entry';

  useEffect(() => {
    if (!isAdding) {
      formRef?.current?.reset();
    }
  }, [isAdding]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon">
          <PlusIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Form method="POST" action="/dashboard/goals" ref={formRef}>
          <div className="grid gap-4">
            <h4 className="mb-1 font-medium leading-none">New entry</h4>
            <div className="grid gap-2">
              <Input type="hidden" name="id" value={id} />
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  className="col-span-2 h-8"
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
                disabled={isAdding}
              >
                Submit
              </Button>
            </div>
          </div>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
