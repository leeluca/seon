import { useMemo } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { DatePicker } from '~/components/DatePicker';
import { Button } from '~/components/ui/button';
import { MAX_INPUT_NUMBER } from '~/constants';
import { ENTRIES, GOALS } from '~/constants/query';
import type { Database } from '~/lib/powersync/AppSchema';
import { deleteEntry, handleSubmit } from '~/services/entry';
import { useUserStore } from '~/states/stores/userStore';
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/types/goal';
import { cn } from '~/utils';
import FormError from './FormError';
import FormItem from './FormItem';
import { NumberInput } from './ui/number-input';

const findPreviousEntry = (
  entries: Database['entry'][],
  selectedDate: Date,
) => {
  return entries
    .filter((entry) => new Date(entry.date) < selectedDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

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

  const previousValue = useMemo(() => {
    return (
      (goalType === 'PROGRESS' &&
        findPreviousEntry(orderedEntries, date)?.value) ||
      0
    );
  }, [goalType, orderedEntries, date]);

  const goalTypeTitle = useMemo(
    () => ({
      COUNT: t`Amount`,
      PROGRESS: t`Progress`,
      BOOLEAN: t`Did you achieve it?`,
    }),
    [t],
  );

  // TODO: move query invalidation to services file
  const onSubmitCallback = () => {
    queryClient.invalidateQueries({
      queryKey: ENTRIES.goalId(goalId).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: GOALS.detail(goalId).queryKey,
    });
    onSubmitCallbackProp?.();
  };

  const form = useForm<{ value?: number; date: Date }>({
    defaultValues: {
      date,
      value: value ?? previousValue,
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
        {
          callback: onSubmitCallback,
          onError: () => {
            toast.error(t`Failed to add entry`);
          },
        },
      );
    },
  });

  return (
    // TODO: refactor to separate goal type components
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className={cn('grid gap-4', className)}>
        <div className="grid gap-4 sm:gap-2">
          <FormItem
            label={t`Date`}
            labelFor="entry-date"
            className="grid items-center gap-4 sm:grid-cols-3"
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
                            void deleteEntry(entryId, goalId, {
                              callback: onSubmitCallback,
                              onError: () => {
                                toast.error(t`Failed to delete entry`);
                              },
                            })
                          }
                          aria-label={t`Delete entry`}
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
              className="grid items-center gap-4 sm:grid-cols-3"
              labelClassName="text-start"
              required
            >
              <form.Field name="value">
                {(field) => {
                  const {
                    value,
                    meta: { errors },
                  } = field.state;
                  const showPreviousValueHelper =
                    !entryId && value === previousValue && !!previousValue;
                  return (
                    <FormError.Wrapper
                      errors={errors}
                      errorClassName="col-span-2 col-start-2"
                    >
                      <div className="col-span-2">
                        {isMobile ? (
                          <div className="relative">
                            {showPreviousValueHelper && (
                              <span className="text-muted-foreground pointer-events-none absolute left-14 top-1/2 z-10 -translate-y-1/2 transform text-xs">
                                {t`Last:`}&nbsp;
                              </span>
                            )}
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
                                className={cn(
                                  'rounded-none',
                                  showPreviousValueHelper && 'pl-[39px]',
                                )}
                              />
                              <NumberInput.Button
                                direction="inc"
                                className="rounded-l-none"
                              />
                            </NumberInput.Root>
                          </div>
                        ) : (
                          <div className="relative">
                            {showPreviousValueHelper && (
                              <span className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 transform text-xs">
                                {t`Last:`}&nbsp;
                              </span>
                            )}
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
                                className={cn(
                                  showPreviousValueHelper && 'pl-[39px]',
                                )}
                              />
                              <div className="flex flex-col">
                                <NumberInput.Button direction="inc" />
                                <NumberInput.Button direction="dec" />
                              </div>
                            </NumberInput.Root>
                          </div>
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
                !state.canSubmit || state.isSubmitting,
              ]}
            >
              {([isSubmitting, isSubmitDisabled]) => (
                <div
                  className={cn('mt-1 grid grid-cols-4 gap-2', {
                    'cursor-not-allowed': !isSubmitting && isSubmitDisabled,
                    'mt-2': isMobile,
                  })}
                >
                  <div
                    className={cn('col-span-1', {
                      'cursor-not-allowed': !entryId,
                    })}
                  >
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full"
                      disabled={!entryId}
                      onClick={() =>
                        entryId &&
                        void deleteEntry(entryId, goalId, {
                          callback: onSubmitCallback,
                          onError: () => {
                            toast.error(t`Failed to delete entry`);
                          },
                        })
                      }
                      size="responsive"
                      aria-label={t`Delete entry`}
                    >
                      <Trash2Icon size={18} />
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="col-span-3"
                    size="responsive"
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
