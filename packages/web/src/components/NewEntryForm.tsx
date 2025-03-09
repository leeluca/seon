import { useMemo } from 'react';
import { t } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { DatePicker } from '~/components/DatePicker';
import { Button } from '~/components/ui/button';
import { MAX_INPUT_NUMBER } from '~/constants';
import { ENTRIES } from '~/constants/query';
import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
import { useUserStore } from '~/states/stores/userStore';
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/types/goal';
import { cn, generateUUIDs } from '~/utils';
import FormError from './FormError';
import FormItem from './FormItem';
import { NumberInput } from './ui/number-input';

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

interface NewEntryFormProps {
  goalId: string;
  entryId?: string;
  date?: Date;
  value?: number;
  orderedEntries: Database['entry'][];
  goalType: GoalType;
  onSubmitCallback?: () => void;
  className?: string;
}

const NewEntryForm = ({
  goalId,
  entryId,
  date = new Date(),
  value,
  goalType,
  orderedEntries,
  onSubmitCallback: onSubmitCallbackProp,
  className,
}: NewEntryFormProps) => {
  const userId = useUserStore((state) => state.user.id);
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isMobile = useViewportStore((state) => state.isMobile);
  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);
  const previousValue =
    (goalType === 'PROGRESS' &&
      findPreviousEntry(orderedEntries, date)?.value) ||
    0;

  const goalTypeTitle = useMemo(
    () => ({
      COUNT: t`Amount`,
      PROGRESS: t`Progress`,
      BOOLEAN: t`Did you achieve it?`,
    }),
    [t],
  );

  const onSubmitCallback = () => {
    queryClient.invalidateQueries({
      queryKey: ENTRIES.goalId(goalId).queryKey,
    });
    onSubmitCallbackProp?.();
  };

  const form = useForm<{ value?: number; date: Date }>({
    defaultValues: {
      date,
      value: value || previousValue,
    },
    validators: {
      onChange({ value }) {
        const { value: inputtedValue } = value;
        if (!inputtedValue === undefined) {
          return 'Missing required fields';
        }
      },
    },
    onSubmit: async ({ value }) => {
      const { value: inputtedValue, date } = value;
      if (inputtedValue === undefined) {
        return;
      }
      await handleSubmit(
        {
          value: inputtedValue,
          date,
          goalId,
          userId,
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
      <div className={cn('grid gap-4', className)}>
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
          {goalType === 'BOOLEAN' ? (
            <FormItem
              label={goalTypeTitle[goalType]}
              labelFor="entry-value"
              className="mt-2 flex w-full flex-col items-start gap-y-2"
              labelClassName="text-start col-span-2"
              required
            >
              <form.Field name="value">
                {(field) => {
                  const {
                    value,
                    meta: { errors },
                  } = field.state;
                  return (
                    <FormError.Wrapper errors={errors}>
                      <div className="mt-1 flex w-full items-center gap-1">
                        <div className="flex w-full items-center gap-1">
                          <Button
                            variant="outline"
                            onClick={() => {
                              field.handleChange(1);
                            }}
                            className={cn(
                              value === 1
                                ? 'border-emerald-200 bg-emerald-100'
                                : '',
                              'h-10 w-1/2 px-8 text-base',
                            )}
                          >
                            <Trans>Yes</Trans>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              field.handleChange(0);
                            }}
                            className={cn(
                              value === 0
                                ? 'border-orange-200 bg-orange-100'
                                : '',
                              'h-10 w-1/2 px-8 text-base',
                            )}
                          >
                            <Trans>No</Trans>
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="hover:bg-destructive/90 hover:text-destructive-foreground flex-shrink-0 justify-self-end"
                          size="icon"
                          disabled={!entryId}
                          onClick={() =>
                            entryId &&
                            void deleteEntry(entryId, onSubmitCallback)
                          }
                        >
                          <Trash2Icon size={18} />
                        </Button>
                      </div>
                    </FormError.Wrapper>
                  );
                }}
              </form.Field>
            </FormItem>
          ) : (
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
                        {isMobile ? (
                          <NumberInput.Root
                            value={value}
                            onChange={(e) => {
                              field.handleChange(Number(e.target.value));
                            }}
                            min={0}
                            max={MAX_INPUT_NUMBER}
                          >
                            <NumberInput.Button
                              direction="dec"
                              className="rounded-r-none"
                            />
                            <NumberInput.Field
                              id="entry-value"
                              autoFocus={!isMobile && !isTouchScreen}
                              className="rounded-none"
                            />
                            <NumberInput.Button
                              direction="inc"
                              className="rounded-l-none"
                            />
                          </NumberInput.Root>
                        ) : (
                          <NumberInput.Root
                            value={value}
                            onChange={(e) => {
                              field.handleChange(Number(e.target.value));
                            }}
                            min={0}
                            max={MAX_INPUT_NUMBER}
                            buttonStacked
                          >
                            <NumberInput.Field
                              id="entry-value"
                              autoFocus={!isMobile && !isTouchScreen}
                            />
                            <div className="flex flex-col">
                              <NumberInput.Button direction="inc" />
                              <NumberInput.Button direction="dec" />
                            </div>
                          </NumberInput.Root>
                        )}
                      </div>
                    </FormError.Wrapper>
                  );
                }}
              </form.Field>
            </FormItem>
          )}
          {goalType !== 'BOOLEAN' && (
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
                    'mt-2': isMobile,
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
                    size={isMobile ? 'lg' : 'default'}
                  >
                    <Trash2Icon size={18} />
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="col-span-2"
                    size={isMobile ? 'lg' : 'default'}
                  >
                    <Trans>Save</Trans>
                  </Button>
                </div>
              )}
            </form.Subscribe>
          )}
        </div>
      </div>
    </form>
  );
};

export default NewEntryForm;
