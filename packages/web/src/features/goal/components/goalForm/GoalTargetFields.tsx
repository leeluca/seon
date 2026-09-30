import { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useSelector, type ValidationError } from '@tanstack/react-form';
import { add, isSameDay } from 'date-fns';
import { PlusIcon, XIcon } from 'lucide-react';

import { MAX_INPUT_NUMBER, MAX_UNIT_LENGTH } from '~/constants';
import { goalFormOptions, isOpenEndedGoal } from '~/features/goal/model/form';
import { FormField } from '~/shared/components/common/form/FormField';
import { Button } from '~/shared/components/ui/button';
import { cn } from '~/utils';
import { maxLengthValidator } from '~/utils/validation';
import { withForm } from '../../hooks/useGoalForm';

/** Stable fallback so the error selectors don't return a new array. */
const NO_ERRORS: ValidationError[] = [];

/** Default target when a habit opts into one: a month of days. */
const DEFAULT_HABIT_TARGET_DAYS = 30;

/**
 * Target amount, unit and target date. Count and progress goals always
 * need all three. A habit starts open-ended and can opt into a
 * target; while it has none, the fields stay mounted but hidden so their
 * validation keeps following the type.
 */
export const GoalTargetFields = withForm({
  ...goalFormOptions,
  props: {
    targetValueId: '',
    unitId: '',
    targetDateId: '',
    /** Matches the form items' padding for the rows that aren't fields. */
    rowClassName: undefined as string | undefined,
  },
  render: function Render({
    form,
    targetValueId,
    unitId,
    targetDateId,
    rowClassName,
  }) {
    const { t } = useLingui();
    const type = useSelector(form.store, (state) => state.values.type);
    const targetValue = useSelector(
      form.store,
      (state) => state.values.targetValue,
    );
    const targetErrors = useSelector(
      form.store,
      (state) => state.fieldMeta.targetValue?.errors ?? NO_ERRORS,
    );
    const unitErrors = useSelector(
      form.store,
      (state) => state.fieldMeta.unit?.errors ?? NO_ERRORS,
    );
    const [isHabitTargetOpen, setIsHabitTargetOpen] = useState(false);

    const isBoolean = type === 'BOOLEAN';
    const showTarget = !isBoolean || isHabitTargetOpen || Boolean(targetValue);

    const openHabitTarget = () => {
      setIsHabitTargetOpen(true);
      if (!form.getFieldValue('targetValue')) {
        form.setFieldValue('targetValue', DEFAULT_HABIT_TARGET_DAYS);
      }
      if (!form.getFieldValue('targetDate')) {
        form.setFieldValue(
          'targetDate',
          add(form.getFieldValue('startDate'), {
            days: DEFAULT_HABIT_TARGET_DAYS,
          }),
        );
      }
    };

    const removeHabitTarget = () => {
      setIsHabitTargetOpen(false);
      form.setFieldValue('targetValue', undefined);
    };

    return (
      <>
        {isBoolean && !showTarget && (
          <div className={cn('flex flex-col items-start gap-1', rowClassName)}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openHabitTarget}
            >
              <PlusIcon data-icon="inline-start" />
              <Trans>Add a target</Trans>
            </Button>
            <p className="text-muted-foreground text-xs">
              <Trans>
                Optional. Without one, Seon tracks how often you show up.
              </Trans>
            </p>
          </div>
        )}
        <div className="grid gap-5" hidden={!showTarget}>
          <FormField
            id={targetValueId}
            label={isBoolean ? t`Days to reach` : t`Target`}
            required={!isBoolean}
            errors={[...targetErrors, ...unitErrors]}
          >
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <form.AppField
                  name="targetValue"
                  validators={{
                    onChangeListenTo: ['type'],
                    onChange: ({ value, fieldApi }) =>
                      fieldApi.form.getFieldValue('type') !== 'BOOLEAN' &&
                      !value
                        ? t`Set a target value for your goal.`
                        : undefined,
                  }}
                >
                  {(field) => (
                    <field.NumberField
                      id={targetValueId}
                      placeholder={t`Amount`}
                      min={0}
                      max={MAX_INPUT_NUMBER}
                    />
                  )}
                </form.AppField>
              </div>
              {!isBoolean && (
                <form.AppField
                  name="unit"
                  validators={{
                    onChange: ({ value }) =>
                      maxLengthValidator(value, MAX_UNIT_LENGTH, t`Unit`) ||
                      undefined,
                  }}
                >
                  {(field) => (
                    <field.TextField
                      id={unitId}
                      className="w-28 sm:w-32"
                      placeholder={t`e.g. books`}
                      aria-label={t`Unit`}
                      maxLength={MAX_UNIT_LENGTH}
                    />
                  )}
                </form.AppField>
              )}
            </div>
          </FormField>
          <form.AppField
            name="targetDate"
            validators={{
              onChangeListenTo: ['startDate', 'type', 'targetValue'],
              onChange: ({ value, fieldApi }) => {
                if (isOpenEndedGoal(fieldApi.form.state.values)) return;
                if (!value) return t`Set a target date for your goal.`;

                const startDate = fieldApi.form.getFieldValue('startDate');
                if (!isSameDay(value, startDate) && value < startDate) {
                  return t`Target date must be after start date`;
                }
              },
            }}
          >
            {(field) => (
              <field.DateField
                id={targetDateId}
                label={t`Target date`}
                required
                showPresetDates
              />
            )}
          </form.AppField>
          {isBoolean && (
            <div className={cn('-mt-3 flex', rowClassName)}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground -ml-3"
                onClick={removeHabitTarget}
              >
                <XIcon data-icon="inline-start" />
                <Trans>Remove target</Trans>
              </Button>
            </div>
          )}
        </div>
      </>
    );
  },
});
