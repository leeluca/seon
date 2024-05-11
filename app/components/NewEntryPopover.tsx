import { PlusIcon } from '@radix-ui/react-icons';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';

export function NewEntryPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon">
          <PlusIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <h4 className="mb-1 font-medium leading-none">New entry</h4>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" className="col-span-2 h-8" />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="amount">How many?</Label>
              <Input id="amount" className="col-span-2 h-8" type="number" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
