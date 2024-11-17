import type { Matcher, SelectSingleEventHandler } from 'react-day-picker';

import * as React from 'react';
import { CalendarIcon } from '@radix-ui/react-icons';
import {
  addDays,
  differenceInCalendarDays,
  formatDate,
  intlFormatDistance,
  startOfDay,
} from 'date-fns';

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

const DATE_DISTANCE_NAMES: { [key: number]: string } = {
  0: 'Today',
  1: 'Tomorrow',
  7: 'In a week',
  30: 'In a month',
};

function getPresetRelativeDateText(date: Date) {
  const differenceInDaysNumber = differenceInCalendarDays(date, new Date());
  return DATE_DISTANCE_NAMES[differenceInDaysNumber];
}
function getRelativeDistanceText(date: Date) {
  const distanceName =
    getPresetRelativeDateText(date) ||
    intlFormatDistance(startOfDay(date), startOfDay(new Date()));

  return distanceName.charAt(0).toUpperCase() + distanceName.slice(1);
}

interface DatePickerProps {
  showPresetDates?: boolean;
  defaultDate?: Date;
  id?: string;
  className?: string;
  disabledDates?: Matcher | Matcher[];
  date?: Date;
  setDate?: (date?: Date) => void;
  disabled?: boolean;
  readOnly?: boolean;
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
      disabled,
      readOnly,
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
    const onSelect = readOnly ? undefined : handleOnSelect;

    React.useImperativeHandle(ref, () => ({
      value: date,
    }));

    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              getPresetRelativeDateText(date) || formatDate(date, 'PP')
            ) : (
              <span>Pick a date</span>
            )}
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
                <SelectValue
                  placeholder={date ? getRelativeDistanceText(date) : 'Select'}
                ></SelectValue>
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="0">{DATE_DISTANCE_NAMES[0]}</SelectItem>
                <SelectItem value="1">{DATE_DISTANCE_NAMES[1]}</SelectItem>
                <SelectItem value="7">{DATE_DISTANCE_NAMES[7]}</SelectItem>
                <SelectItem value="30">{DATE_DISTANCE_NAMES[30]}</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="rounded-md border">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onSelect}
              disabled={disabledDates}
              disableNavigation={readOnly}
              defaultMonth={date ?? defaultDate}
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);

DatePicker.displayName = 'DatePicker';
