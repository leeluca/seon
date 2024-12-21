import { useForm } from '@tanstack/react-form';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import useDelayedExecution from '~/apis/hooks/useDelayedExecution';
import { DatePicker } from '~/components/DatePicker';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { MAX_INPUT_NUMBER } from '~/constants';
import db from '~/lib/database';
import { useUser } from '~/states/userContext';
import { cn, generateUUIDs } from '~/utils';
import { blockNonNumberInput, parseInputtedNumber } from '~/utils/validation';
import FormError from './FormError';
import FormItem from './FormItem';

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
  date?: Date;
  value?: number;
  onSubmitCallback?: () => void;
}

const NewEntryForm = ({
  id,
  date = new Date(),
  value,
  onSubmitCallback = () => {},
}: NewEntryFormProps) => {
  const user = useUser();
  const form = useForm<{ value?: number; date: Date }>({
    defaultValues: {
      date,
      value: value ?? 0,
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
                        readOnly
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.Field>
          </FormItem>

          <FormItem
            label="Amount"
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

export default NewEntryForm;
