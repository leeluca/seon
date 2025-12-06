import { useMemo } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  isPast as checkIsPast,
  isToday as checkIsToday,
  differenceInCalendarDays,
} from 'date-fns';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import FormError from '~/components/form/FormError';
import FormItem from '~/components/FormItem';
import { Button } from '~/components/ui/button';
import { NumberInput } from '~/components/ui/number-input';
import { MAX_INPUT_NUMBER } from '~/constants';
import { ENTRIES, GOALS } from '~/constants/query';
import { useIds } from '~/hooks/useIds';
import type { Database } from '~/data/db/AppSchema';
import { deleteEntry, getPreviousEntry } from '~/services/entry';
import { useUserStore } from '~/states/stores/userStore';
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/types/goal';
import { cn } from '~/utils';
import { ENTRY_FIELD_SUFFIX } from '../constants';
import { useEntryForm } from '../hooks/useEntryForm';

interface CreateEntryFormProps {
  goalId: string;
  entryId?: string;
  date?: Date;
  value?: number;
  orderedEntries: Database['entry'][];
  goalType: GoalType;
  onSubmitCallback?: () => void;
  className?: string;
}
const CreateEntryForm = ({
  goalId,
  entryId,
  date = new Date(),
  value,
  goalType,
  orderedEntries,
  onSubmitCallback: onSubmitCallbackProp,
  className,
}: CreateEntryFormProps) => {
  const userId = useUserStore((state) => state.user.id);
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isMobile = useViewportStore((state) => state.isMobile);
  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);

  const previousValue = useMemo(() => {
    return (
      (goalType === 'PROGRESS' &&
        getPreviousEntry(orderedEntries, date)?.value) ||
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

  const onSubmitCallback = () => {
    queryClient.invalidateQueries({
      queryKey: ENTRIES.goalId(goalId).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: GOALS.detail(goalId).queryKey,
    });
    onSubmitCallbackProp?.();
  };

  const ids = useIds(ENTRY_FIELD_SUFFIX);

  const form = useEntryForm({
    goalId,
    userId,
    date,
    value,
    previousValue,
    onSubmitCallback,
  });

  // FIXME: repeated logic from GoalStatusSummary.tsx
  // Fetch goal data to calculate averageNeededPerDay
  const { data: goal } = useQuery(GOALS.detail(goalId));

  // Calculate averageNeededPerDay
  const averageNeededPerDay = useMemo(() => {
    if (!goal || goalType === 'BOOLEAN') return 0;

    const targetDate = new Date(goal.targetDate);
    const entriesSum = goal.currentValue ?? 0;
    const isGoalCompleted = entriesSum >= goal.target;
    const isPastTargetDate =
      !checkIsToday(targetDate) && checkIsPast(targetDate);

    if (isGoalCompleted || isPastTargetDate) {
      return 0;
    }

    const daysRemaining = Math.max(
      differenceInCalendarDays(targetDate, new Date()) + 1,
      0,
    );

    const remaining = Math.max(goal.target - entriesSum, 0);

    // Check if an entry was added today
    const hasEntryToday = orderedEntries.some((entry) =>
      checkIsToday(entry.date),
    );

    const adjustedDaysRemaining = hasEntryToday
      ? Math.max(daysRemaining - 1, 0)
      : daysRemaining;

    const averageNeeded = remaining / Math.max(adjustedDaysRemaining, 1);

    return Math.ceil(averageNeeded);
  }, [goal, goalType, orderedEntries]);

  // TODO: refactor to separate goal type components
  return (
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
            labelFor={ids.entryDate}
            className="grid items-center gap-4 sm:grid-cols-3"
            labelClassName="text-start"
          >
            <form.AppField name="date">
              {(field) => {
                const {
                  meta: { errors },
                } = field.state;
                return (
                  <FormError.Wrapper
                    errors={errors}
                    errorClassName="col-span-2 col-start-2"
                  >
                    <div className="col-span-2">
                      <field.DateField
                        id={ids.entryDate}
                        defaultDate={field.state.value}
                        readOnly
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.AppField>
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
                              'h-10 w-1/2 px-8 text-base hover:bg-orange-100/80',
                            )}
                          >
                            <Trans>No</Trans>
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="hover:bg-destructive/90 hover:text-destructive-foreground shrink-0 justify-self-end"
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
              <form.AppField name="value">
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
                        <field.NumberField
                          id={ids.entryValue}
                          min={0}
                          max={MAX_INPUT_NUMBER}
                          buttonStacked={!isMobile}
                          autoFocus={!isMobile && !isTouchScreen}
                          autoComplete="off"
                          helperText={
                            showPreviousValueHelper ? `${t`Last:`} ` : undefined
                          }
                          customButton={
                            averageNeededPerDay > 0 ? (
                              <NumberInput.CustomButton
                                amount={averageNeededPerDay}
                                label={`+${averageNeededPerDay}`}
                                className="h-7 rounded-md px-2 text-xs"
                                aria-label={t`Suggested amount`}
                              />
                            ) : null
                          }
                        />
                      </div>
                    </FormError.Wrapper>
                  );
                }}
              </form.AppField>
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

export default CreateEntryForm;
