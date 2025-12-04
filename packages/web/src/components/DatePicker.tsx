import React, { useState } from 'react';
import type { Matcher, SelectSingleEventHandler } from 'react-day-picker';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
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

const dateDistanceNames = {
  0: msg`Today`,
  1: msg`Tomorrow`,
  7: msg`In a week`,
  30: msg`In a month`,
  31: msg`In a month`,
} as const;

export function getPresetRelativeDateText(
  d: Date,
  translate: (msgDescriptor: MessageDescriptor) => string,
) {
  const differenceInDaysNumber = differenceInCalendarDays(d, new Date());
  const msgDescriptor =
    dateDistanceNames[differenceInDaysNumber as keyof typeof dateDistanceNames];
  return msgDescriptor ? translate(msgDescriptor) : undefined;
}

export function getRelativeDistanceText(
  d: Date,
  translate: (msgDescriptor: MessageDescriptor) => string,
) {
  const distanceName =
    getPresetRelativeDateText(d, translate) ||
    intlFormatDistance(startOfDay(d), startOfDay(new Date()));

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
  useRelativeDistance?: boolean;
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
      useRelativeDistance = false,
    }: DatePickerProps,
    ref: React.Ref<{ value: Date | undefined }>,
  ) => {
    const { t } = useLingui();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [dateState, setDateState] = useState<Date | undefined>(defaultDate);
    const [month, setMonth] = useState<Date | undefined>(dateState);

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
      <Popover
        open={isPopoverOpen}
        onOpenChange={readOnly ? undefined : setIsPopoverOpen}
      >
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              {
                'text-muted-foreground': !date,
                'hover:bg-background cursor-default': readOnly,
              },
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              (useRelativeDistance && getPresetRelativeDateText(date, t)) ||
              formatDate(date, 'PP')
            ) : (
              <span>
                <Trans>Pick a date</Trans>
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex w-auto flex-col space-y-2 p-2"
          id={id}
          collisionPadding={{ bottom: 40 }}
        >
          {showPresetDates && (
            <Select
              onValueChange={(value) => {
                const newDate = addDays(new Date(), Number.parseInt(value, 10));
                setDate(newDate);
                setMonth(newDate);
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    date ? getRelativeDistanceText(date, t) : t`Select`
                  }
                />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="0">{t(dateDistanceNames[0])}</SelectItem>
                <SelectItem value="1">{t(dateDistanceNames[1])}</SelectItem>
                <SelectItem value="7">{t(dateDistanceNames[7])}</SelectItem>
                <SelectItem value="30">{t(dateDistanceNames[30])}</SelectItem>
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
              month={month}
              onMonthChange={setMonth}
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);

DatePicker.displayName = 'DatePicker';
