import { t } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useForm } from '@tanstack/react-form';
import { LoaderCircleIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { DatePicker } from '~/components/DatePicker';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { MAX_INPUT_NUMBER } from '~/constants';
import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
import { useUser } from '~/states/userContext';
import { cn, generateUUIDs } from '~/utils';
import { blockNonNumberInput, parseInputtedNumber } from '~/utils/validation';
import FormError from './FormError';
import FormItem from './FormItem';

async function deleteEntry(id: string, callback?: () => void) {
  await db.deleteFrom('entry').where('id', '=', id).execute();
  callback?.();
}

const findPreviousEntry = (
  entries: Database['entry'][],
  selectedDate: Date,
) => {
  return entries
    .filter((entry) => new Date(entry.date) < selectedDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

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

    await db.executeQuery(entryOperation);

    onSubmitCallback();
    return true;
  } catch (error) {
    console.error('err', error);
    toast.error('Failed to add entry');
    onSubmitCallback();
    return false;
  }
}

const goalTypeTitle = {
  COUNT: t`Amount`,
  PROGRESS: t`Progress`,
  BOOLEAN: t`Yes or No`,
};
interface NewEntryFormProps {
  goalId: string;
  entryId?: string;
  date?: Date;
  value?: number;
  orderedEntries: Database['entry'][];
  goalType: GoalType;
  onSubmitCallback?: () => void;
}

const NewEntryForm = ({
  goalId,
  entryId,
  date = new Date(),
  value,
  goalType,
  orderedEntries,
  onSubmitCallback = () => {},
}: NewEntryFormProps) => {
  const user = useUser();
  const { t } = useLingui();
  const previousValue =
    (goalType === 'PROGRESS' &&
      findPreviousEntry(orderedEntries, date)?.value) ||
    0;

  const form = useForm<{ value?: number; date: Date }>({
    defaultValues: {
      date,
      value: value || previousValue,
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
          goalId,
          userId: user.id,
        },
        onSubmitCallback,
      );
    },
  });

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
            label={t`Date`}
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
            label={goalTypeTitle[goalType]}
            labelFor="entry-value"
            className="grid grid-cols-3 items-center"
            labelClassName="text-start"
            required
          >
            <form.Field name="value">
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
                      {/* TODO: custom number input */}
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
                className={cn('mt-1 grid grid-cols-3 gap-2', {
                  'cursor-not-allowed': isSubmitDisabled,
                })}
              >
                {/* FIXME: apply cursor-not-allowed to delete button individually */}
                <Button
                  type="button"
                  variant="destructive"
                  className="col-span-1"
                  disabled={!entryId}
                  onClick={() =>
                    entryId && void deleteEntry(entryId, onSubmitCallback)
                  }
                >
                  <Trash2Icon size={18} />
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="col-span-2"
                >
                  {isSubmitting && (
                    <LoaderCircleIcon size={14} className="mr-2 animate-spin" />
                  )}
                  <Trans>Save</Trans>
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
