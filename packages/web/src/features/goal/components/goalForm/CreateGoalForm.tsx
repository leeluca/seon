import { useLingui } from '@lingui/react/macro';
import { MAX_GOAL_NAME_LENGTH } from '~/constants';
import { GOAL_FIELD_SUFFIX, goalFormOptions } from '~/features/goal/model';
import { useIds } from '~/hooks/useIds';
import { cn } from '~/utils';
import { maxLengthValidator } from '~/utils/validation';
import { withForm } from '../../hooks/useGoalForm';
import { GOAL_FORM_ID } from '../../model';
import { GoalOptionalFields } from './GoalOptionalFields';
import { GoalTargetFields } from './GoalTargetFields';
import { GoalTypeField } from './GoalTypeField';

interface GoalFormProps {
  className?: string;
  formItemClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  collapseOptionalFields?: boolean;
  autoFocus?: boolean;
}

const CreateGoalForm = withForm({
  ...goalFormOptions,
  props: {
    className: undefined,
    formItemClassName: undefined,
    labelClassName: undefined,
    errorClassName: undefined,
    collapseOptionalFields: false,
    autoFocus: false,
  } as GoalFormProps,
  render: function Render({
    form,
    className,
    formItemClassName,
    labelClassName,
    errorClassName,
    collapseOptionalFields = false,
    autoFocus = false,
  }) {
    const { t } = useLingui();
    const ids = useIds(GOAL_FIELD_SUFFIX);

    return (
      <form.FormLayout
        itemClassName={formItemClassName}
        labelClassName={labelClassName}
        controlClassName="col-span-1"
        errorClassName={errorClassName}
      >
        <form.FormRoot
          id={GOAL_FORM_ID}
          className={cn('grid gap-5 py-4', className)}
        >
          <form.AppField
            name="title"
            validators={{
              onChange: ({ value }) => {
                if (!value.trim()) return t`Choose a name for your goal.`;
                return (
                  maxLengthValidator(
                    value,
                    MAX_GOAL_NAME_LENGTH,
                    t`Goal name`,
                  ) || undefined
                );
              },
            }}
          >
            {(field) => (
              <field.TextField
                id={ids.title}
                label={t`Goal name`}
                required
                placeholder={t`e.g. Learn 1,000 French words`}
                autoFocus={autoFocus}
                maxLength={MAX_GOAL_NAME_LENGTH}
              />
            )}
          </form.AppField>
          <GoalTypeField
            form={form}
            countId={ids.typeCount}
            progressId={ids.typeProgress}
            booleanId={ids.typeBoolean}
          />
          <GoalTargetFields
            form={form}
            targetValueId={ids.targetValue}
            unitId={ids.unit}
            targetDateId={ids.targetDate}
            rowClassName={formItemClassName}
          />
          <GoalOptionalFields
            form={form}
            collapsed={collapseOptionalFields}
            startDateId={ids.startDate}
            initialValueId={ids.initialValue}
            toggleId={ids.toggleExtra}
          />
        </form.FormRoot>
      </form.FormLayout>
    );
  },
});

export default CreateGoalForm;
