import type { Matcher, SelectSingleEventHandler } from 'react-day-picker';

import * as React from 'react';
import { CalendarIcon } from '@radix-ui/react-icons';
import { addDays, formatDate } from 'date-fns';

import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/utils';

interface DatePickerProps {
  showPresetDates?: boolean;
  defaultDate?: Date;
  id?: string;
  className?: string;
  disabledDates?: Matcher | Matcher[];
  date?: Date;
  setDate?: (date?: Date) => void;
}
export const DatePicker = React.forwardRef(
  (
    {
      defaultDate,
      showPresetDates,
      id,
      className,
      disabledDates,
      date: dateProp,
      setDate: setDateProp,
    }: DatePickerProps,
    ref: React.Ref<{ value: Date | undefined }>,
  ) => {
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [dateState, setDateState] = React.useState<Date | undefined>(
      defaultDate,
    );

    const date = dateProp ?? dateState;
    const setDate = setDateProp ?? setDateState;

    const handleOnSelect: SelectSingleEventHandler = (date?: Date) => {
      setDate(date);
      setIsPopoverOpen(false);
    };

    React.useImperativeHandle(ref, () => ({
      value: date,
    }));

    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? formatDate(date, 'PP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex w-auto flex-col space-y-2 p-2"
          id={id}
        >
          {showPresetDates && (
            <Select
              onValueChange={(value) =>
                setDate(addDays(new Date(), parseInt(value)))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="0">Today</SelectItem>
                <SelectItem value="1">Tomorrow</SelectItem>
                <SelectItem value="3">In 3 days</SelectItem>
                <SelectItem value="7">In a week</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="rounded-md border">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleOnSelect}
              disabled={disabledDates}
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);

DatePicker.displayName = 'DatePicker';
