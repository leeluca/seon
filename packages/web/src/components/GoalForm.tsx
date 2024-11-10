import { useForm } from '@tanstack/react-form';

import { DatePicker } from '~/components/DatePicker';
import FormError from '~/components/FormError';
import FormItem from '~/components/FormItem';
import { Input } from '~/components/ui/input';
import {
  MAX_GOAL_NAME_LENGTH,
  MAX_INPUT_NUMBER,
  MAX_UNIT_LENGTH,
} from '~/constants';
import {
  blockNonNumberInput,
  maxLengthValidator,
  parseInputtedNumber,
} from '~/utils/validation';

export const GOAL_FORM_ID = 'goal-form';

export interface NewGoal {
  title: string;
  targetValue?: number;
  unit: string;
  startDate: Date;
  targetDate?: Date;
  initialValue: number;
}

interface NewGoalFormProps {
  form: ReturnType<typeof useForm<NewGoal>>;
  formItemClassName?: string;
}
function NewGoalForm({ form, formItemClassName }: NewGoalFormProps) {
  return (
    <form
      id={GOAL_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="grid gap-4 py-4"
    >
      <FormItem
        label="Goal name"
        labelFor="title"
        className={formItemClassName}
        required
      >
        <form.Field
          name="title"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return 'Choose a name for your goal.';
              return (
                maxLengthValidator(value, MAX_GOAL_NAME_LENGTH, 'Goal name') ||
                undefined
              );
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
                errorClassName="col-span-3 col-start-2"
              >
                <div className="col-span-2">
                  <Input
                    id="title"
                    value={value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="eg. 'Learn 1000 Japanese words'"
                    maxLength={100}
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
      <FormItem
        label="Target value"
        labelFor="target-value"
        required
        className={formItemClassName}
      >
        <form.Field
          name="targetValue"
          validators={{
            onChange: ({ value }) =>
              !value && 'Set a target value for your goal.',
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
                errorClassName="col-span-3 col-start-2"
              >
                <div className="col-span-2">
                  <Input
                    id="target-value"
                    type="number"
                    // Removes leading zeros
                    value={value?.toString() || ''}
                    onKeyDown={(e) => blockNonNumberInput(e)}
                    onChange={(e) => {
                      parseInputtedNumber(e.target.value, field.handleChange);
                    }}
                    placeholder="Value for goal completion (number)"
                    min={0}
                    max={MAX_INPUT_NUMBER}
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
      <FormItem
        label="Target date"
        labelFor="targe-date"
        required
        className={formItemClassName}
      >
        <form.Field
          name="targetDate"
          validators={{
            onChangeListenTo: ['startDate'],
            onChange: ({ value, fieldApi }) => {
              if (value && value < fieldApi.form.getFieldValue('startDate')) {
                return 'Target date must be after start date';
              }
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
                errorClassName="col-span-3 col-start-2"
              >
                <div className="col-span-2">
                  <DatePicker
                    id="target-date"
                    date={value}
                    setDate={(date) => date && field.handleChange(date)}
                    showPresetDates
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
      <FormItem
        label="Start date"
        labelFor="start-date"
        required
        className={formItemClassName}
      >
        <form.Field name="startDate">
          {(field) => {
            const {
              value,
              meta: { errors },
            } = field.state;
            return (
              <FormError.Wrapper
                errors={errors}
                errorClassName="col-span-3 col-start-2"
              >
                <div className="col-span-2">
                  <DatePicker
                    id="start-date"
                    defaultDate={new Date()}
                    date={value}
                    setDate={(date) => date && field.handleChange(date)}
                    showPresetDates
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
      <FormItem label="Unit" labelFor="unit" className={formItemClassName}>
        <form.Field
          name="unit"
          validators={{
            onChange: ({ value }) => {
              return (
                maxLengthValidator(value, MAX_UNIT_LENGTH, 'Unit') || undefined
              );
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
                errorClassName="col-span-3 col-start-2"
              >
                <div className="col-span-2">
                  <Input
                    id="unit"
                    value={value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. words"
                    maxLength={100}
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
      <FormItem
        label="Initial value"
        labelFor="initial-value"
        className={formItemClassName}
      >
        <form.Field name="initialValue">
          {(field) => {
            const {
              value,
              meta: { errors },
            } = field.state;
            return (
              <FormError.Wrapper
                errors={errors}
                errorClassName="col-span-3 col-start-2"
              >
                <div className="col-span-2">
                  <Input
                    id="initial-value"
                    type="number"
                    // Removes leading zeros
                    value={value?.toString()}
                    onKeyDown={(e) => blockNonNumberInput(e)}
                    onChange={(e) => {
                      parseInputtedNumber(
                        e.target.value,
                        (parsedNumber?: number) => {
                          parsedNumber
                            ? field.handleChange(parsedNumber)
                            : field.handleChange(0);
                        },
                      );
                    }}
                    placeholder="Numbers only"
                    min={0}
                    max={MAX_INPUT_NUMBER}
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
    </form>
  );
}

export default NewGoalForm;
