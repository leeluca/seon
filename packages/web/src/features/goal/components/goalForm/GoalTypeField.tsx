import { useId, type ReactNode } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { InfoCircledIcon } from '@radix-ui/react-icons';

import type { GoalType } from '~/features/goal/model';
import { goalFormOptions } from '~/features/goal/model/form';
import { FormField } from '~/shared/components/common/form/FormField';
import { Label } from '~/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/shared/components/ui/radio-group';
import { ResponsiveTooltip } from '~/shared/components/ui/responsive-tooltip';
import { useViewportStore } from '~/states/stores/viewportStore';
import { withForm } from '../../hooks/useGoalForm';

const goalTypeOptions: Array<{
  value: GoalType;
  label: ReactNode;
  description: ReactNode;
}> = [
  {
    value: 'COUNT',
    label: <Trans>Count</Trans>,
    description: (
      <Trans>
        Track how many times you complete something each day.
        <br />
        E.g. '30 minutes of exercise' or 'drink 8 glasses of water'.
      </Trans>
    ),
  },
  {
    value: 'PROGRESS',
    label: <Trans>Progress</Trans>,
    description: (
      <Trans>
        Track your overall progress towards a target.
        <br />
        E.g. reading a book (current page) or saving money (total amount saved).
      </Trans>
    ),
  },
  {
    value: 'BOOLEAN',
    label: <Trans>Yes or no</Trans>,
    description: (
      <Trans>
        Track daily completion with a simple yes or no.
        <br />
        E.g. habits like meditation or taking vitamins.
      </Trans>
    ),
  },
];

export const GoalTypeField = withForm({
  ...goalFormOptions,
  props: {
    countId: '',
    progressId: '',
    booleanId: '',
  },
  render: function Render({ form, countId, progressId, booleanId }) {
    const { t } = useLingui();
    const groupId = useId();
    const isMobile = useViewportStore((state) => state.isMobile);

    return (
      <form.AppField name="type">
        {(field) => (
          <FormField
            id={groupId}
            label={t`Type`}
            required
            errors={field.state.meta.errors}
            itemClassName="min-h-9"
          >
            <RadioGroup
              id={groupId}
              orientation="horizontal"
              className="flex flex-row flex-wrap gap-4 sm:gap-2"
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as GoalType)}
              onBlur={field.handleBlur}
              aria-label={t`Type`}
              aria-describedby={
                field.state.meta.errors.some(Boolean)
                  ? `${groupId}-error`
                  : undefined
              }
            >
              {goalTypeOptions.map((option) => {
                const optionId = {
                  COUNT: countId || `${groupId}-count`,
                  PROGRESS: progressId || `${groupId}-progress`,
                  BOOLEAN: booleanId || `${groupId}-boolean`,
                }[option.value];

                return (
                  <div key={option.value} className="flex items-center">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={option.value} id={optionId} />
                      <Label htmlFor={optionId}>{option.label}</Label>
                    </div>
                    <ResponsiveTooltip
                      contentClassName="max-w-[90%]"
                      content={
                        <p className="break-keep">{option.description}</p>
                      }
                      side={isMobile ? 'top' : 'bottom'}
                    >
                      <InfoCircledIcon
                        height={isMobile ? 18 : 16}
                        width={isMobile ? 18 : 16}
                        className="ml-1 sm:mb-2"
                      />
                    </ResponsiveTooltip>
                  </div>
                );
              })}
            </RadioGroup>
          </FormField>
        )}
      </form.AppField>
    );
  },
});
