import { useMemo, useState } from 'react';
import { useQuery } from '@powersync/react';
import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { InfoIcon, LoaderCircleIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import useDelayedExecution from '~/apis/hooks/useDelayedExecution';
import { DatePicker } from '~/components/DatePicker';
import { Button, buttonVariants } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { MAX_INPUT_NUMBER } from '~/constants';
import db from '~/lib/database';
import { useUser } from '~/states/userContext';
import { cn, generateUUIDs } from '~/utils';
import { blockNonNumberInput, parseInputtedNumber } from '~/utils/validation';
import FormError from './FormError';
import FormItem from './FormItem';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

async function handleSubmit(
  {
    value,
    date,
    goalId,
    userId,
  }: { value: number; date: Date; goalId: string; userId: string },
  onSubmitCallback: () => void,
) {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  try {
    const sameDayEntry = await db
      .selectFrom('entry')
      .selectAll()
      .where((eb) =>
        eb.and([
          eb('goalId', '=', goalId),
          eb('date', '>=', startOfDay.toISOString()),
          eb('date', '<=', endOfDay.toISOString()),
        ]),
      )
      .executeTakeFirst();

    const entryOperation = sameDayEntry
      ? db.updateTable('entry').set({ value }).where('id', '=', sameDayEntry.id)
      : (() => {
          const { uuid, shortUuid } = generateUUIDs();
          return db.insertInto('entry').values({
            id: uuid,
            shortId: shortUuid,
            goalId: goalId,
            value,
            date: date.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId,
          });
        })();

    const updatedGoalValue = sameDayEntry
      ? -Number(sameDayEntry.value) + value
      : value;
    const goalUpdateOperation = db
      .updateTable('goal')
      .set((eb) => ({
        currentValue: eb('currentValue', '+', updatedGoalValue),
      }))
      .where('id', '=', goalId);

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
  const user = useUser();
  const { data: entries } = useQuery(
    db.selectFrom('entry').selectAll().where('goalId', '=', id),
  );

  const entriesMap = useMemo(
    () =>
      new Map(
        entries.map((entry) => [new Date(entry.date).toDateString(), entry]),
      ),
    [entries],
  );
  const form = useForm<{ value?: number; date: Date }>({
    defaultValues: {
      date: new Date(),
      value: 0,
    },
    validators: {
      onChange({ value }) {
        const { value: inputtedValue } = value;
        if (!inputtedValue) {
          return 'Missing required fields';
        }
      },
    },
    onSubmit: async ({ value }) => {
      const { value: inputtedValue, date } = value;
      if (!inputtedValue || !user) {
        return;
      }
      await handleSubmit(
        {
          value: inputtedValue,
          date,
          goalId: id,
          userId: user.id,
        },
        onSubmitCallback,
      );
    },
  });

  const {
    startTimeout: delayedValidation,
    clearExistingTimeout: clearTimeout,
  } = useDelayedExecution(() => void form.validateAllFields('change'));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="grid gap-4">
        <h4 className="mb-1 font-medium leading-none">New entry</h4>
        <div className="grid gap-2">
          <FormItem
            label="Date"
            labelFor="entry-date"
            className="grid grid-cols-3 items-center gap-4"
            labelClassName="text-start"
          >
            <form.Field name="date">
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <FormError.Wrapper
                    errors={errors}
                    errorClassName="col-span-2 col-start-2"
                  >
                    <div className="col-span-2">
                      {/* FIXME: only values between goal start and end dates should be selectable  */}
                      <DatePicker
                        id="entry-date"
                        defaultDate={value}
                        date={value}
                        setDate={(date) => date && field.handleChange(date)}
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.Field>
          </FormItem>

          <FormItem
            label="How many?"
            labelFor="entry-value"
            className="grid grid-cols-3 items-center"
            labelClassName="text-start"
            required
          >
            <form.Field
              name="value"
              validators={{
                onChange: ({ value }) => {
                  return !value && 'Choose a value higher than 0.';
                },
              }}
            >
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <FormError.Wrapper
                    errors={errors}
                    errorClassName="col-span-2 col-start-2"
                  >
                    <div className="col-span-2">
                      <Input
                        id="entry-value"
                        type="number"
                        // Removes leading zeros
                        value={value?.toString()}
                        onKeyDown={(e) => blockNonNumberInput(e)}
                        onChange={(e) => {
                          parseInputtedNumber(
                            e.target.value,
                            field.handleChange,
                          );
                        }}
                        placeholder="numbers only"
                        min={0}
                        max={MAX_INPUT_NUMBER}
                        autoFocus
                      />
                    </div>
                    <form.Subscribe selector={(state) => [state.values.date]}>
                      {([date]) => {
                        const sameDayEntry = entriesMap.get(
                          date.toDateString(),
                        );

                        if (!sameDayEntry) {
                          return null;
                        }
                        return (
                          <div className="col-span-2 col-start-2">
                            <div className="flex items-center text-[0.8rem] font-medium text-gray-500">
                              <InfoIcon size={18} className="mr-1 shrink-0" />
                              <p>
                                Your entry of{' '}
                                <span className="italic">
                                  {sameDayEntry.value}
                                </span>{' '}
                                for {format(sameDayEntry.date, 'PP')} will be
                                overwritten.
                              </p>
                            </div>
                          </div>
                        );
                      }}
                    </form.Subscribe>
                  </FormError.Wrapper>
                );
              }}
            </form.Field>
          </FormItem>
          <form.Subscribe
            selector={(state) => [
              state.isSubmitting,
              !state.isTouched || !state.canSubmit || state.isSubmitting,
            ]}
          >
            {([isSubmitting, isSubmitDisabled]) => (
              <div
                onMouseEnter={delayedValidation}
                onMouseLeave={clearTimeout}
                className={cn('grid grid-cols-3', {
                  'cursor-not-allowed': isSubmitDisabled,
                })}
              >
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="col-span-full mt-2"
                >
                  {isSubmitting && (
                    <LoaderCircleIcon size={14} className="mr-2 animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </form.Subscribe>
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
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
            aria-label="Add new goal entry"
          >
            <PlusIcon size={18} />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Record goal progress</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-fit max-w-[325px]">
        <NewEntryForm id={id} onSubmitCallback={togglePopover} />
      </PopoverContent>
    </Popover>
  );
}
