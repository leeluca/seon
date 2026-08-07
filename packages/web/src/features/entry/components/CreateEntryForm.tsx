import { useMemo, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import {
  isPast as checkIsPast,
  isToday as checkIsToday,
  differenceInCalendarDays,
} from 'date-fns';
import { Trash2Icon } from 'lucide-react';

import { MAX_INPUT_NUMBER } from '~/constants';
import { GOALS } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import { getPreviousEntry } from '~/data/domain/entryRepo';
import type { GoalType } from '~/features/goal/model';
import { useIds } from '~/hooks/useIds';
import { FormField } from '~/shared/components/common/form/FormField';
import { Button } from '~/shared/components/ui/button';
import { NumberInput } from '~/shared/components/ui/number-input';
import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';
import { useEntryForm } from '../hooks/useEntryForm';
import { useEntryMutations } from '../hooks/useEntryMutations';
import { ENTRY_FIELD_SUFFIX } from '../model/constants';

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
  date: dateProp,
  value,
  goalType,
  orderedEntries,
  onSubmitCallback: onSubmitCallbackProp,
  className,
}: CreateEntryFormProps) => {
  const { t } = useLingui();
  const isMobile = useViewportStore((state) => state.isMobile);
  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);
  const ids = useIds(ENTRY_FIELD_SUFFIX);
  const booleanGroupId = `${ids.entryValue}-group`;
  const [defaultDate] = useState(() => new Date());
  const date = dateProp ?? defaultDate;

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

  const { save, remove } = useEntryMutations({
    goalId,
    onSuccess: onSubmitCallbackProp,
  });

  const form = useEntryForm({
    date,
    value,
    previousValue,
    onSubmit: (entry) => save.mutateAsync(entry),
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

  return (
    <form.AppForm>
      <form.FormRoot>
        <div className={cn('grid gap-4', className)}>
          <div className="grid gap-4 sm:gap-2">
            <form.AppField name="date">
              {(field) => (
                <field.DateField
                  id={ids.entryDate}
                  label={t`Date`}
                  itemClassName="grid items-center gap-4 sm:grid-cols-3"
                  labelClassName="text-start"
                  controlClassName="col-span-2"
                  errorClassName="col-span-2 col-start-2"
                  defaultDate={field.state.value}
                  readOnly
                />
              )}
            </form.AppField>
            {goalType === 'BOOLEAN' ? (
              <form.AppField
                name="value"
                validators={{
                  onChange: ({ value }) =>
                    value === undefined ? t`Choose yes or no.` : undefined,
                }}
              >
                {(field) => {
                  const { value, meta } = field.state;
                  return (
                    <FormField
                      id={booleanGroupId}
                      label={goalTypeTitle[goalType]}
                      required
                      errors={meta.errors}
                      itemClassName="mt-2 flex w-full flex-col items-start gap-y-2"
                      labelClassName="text-start"
                    >
                      <fieldset
                        id={booleanGroupId}
                        aria-label={goalTypeTitle[goalType]}
                        className="mt-1 flex w-full items-center gap-1"
                      >
                        <div className="flex w-full items-center gap-1">
                          <Button
                            id={ids.entryValue}
                            type="submit"
                            variant="outline"
                            disabled={save.isPending}
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
                            type="submit"
                            variant="outline"
                            disabled={save.isPending}
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
                          disabled={!entryId || remove.isPending}
                          onClick={() => entryId && remove.mutate(entryId)}
                          aria-label={t`Delete entry`}
                        >
                          <Trash2Icon size={18} />
                        </Button>
                      </fieldset>
                    </FormField>
                  );
                }}
              </form.AppField>
            ) : (
              <form.AppField
                name="value"
                validators={{
                  onChange: ({ value }) =>
                    value === undefined ? t`Enter a value.` : undefined,
                }}
              >
                {(field) => {
                  const { value } = field.state;
                  const showPreviousValueHelper =
                    !entryId && value === previousValue && !!previousValue;
                  return (
                    <field.NumberField
                      id={ids.entryValue}
                      label={goalTypeTitle[goalType]}
                      required
                      itemClassName="grid items-center gap-4 sm:grid-cols-3"
                      labelClassName="text-start"
                      controlClassName="col-span-2"
                      errorClassName="col-span-2 col-start-2"
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
                  );
                }}
              </form.AppField>
            )}
            {goalType !== 'BOOLEAN' && (
              <div
                className={cn('mt-1 grid grid-cols-4 gap-2', {
                  'mt-2': isMobile,
                })}
              >
                <div
                  className={cn('col-span-1', {
                    'cursor-not-allowed': !entryId || remove.isPending,
                  })}
                >
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    disabled={!entryId || remove.isPending}
                    onClick={() => entryId && remove.mutate(entryId)}
                    size="responsive"
                    aria-label={t`Delete entry`}
                  >
                    <Trash2Icon size={18} />
                  </Button>
                </div>
                <form.SubmitButton className="col-span-3" size="responsive">
                  <Trans>Save</Trans>
                </form.SubmitButton>
              </div>
            )}
          </div>
        </div>
      </form.FormRoot>
    </form.AppForm>
  );
};

export default CreateEntryForm;
