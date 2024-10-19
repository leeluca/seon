import { useForm } from '@tanstack/react-form';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import useDelayedExecution from '~/apis/hooks/useDelayedExecution';
import { DatePicker } from '~/components/DatePicker';
import FormError from '~/components/FormError';
import FormItem from '~/components/FormItem';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import {
  MAX_GOAL_NAME_LENGTH,
  MAX_INPUT_NUMBER,
  MAX_UNIT_LENGTH,
} from '~/constants';
import db from '~/lib/database';
import { Database } from '~/lib/powersync/AppSchema';
import { useUser } from '~/states/userContext';
import { cn, generateUUIDs } from '~/utils';
import {
  blockNonNumberInput,
  maxLengthValidator,
  parseInputtedNumber,
} from '~/utils/validation';

export const Route = createLazyFileRoute('/_main/goals/new')({
  component: NewGoalDialog,
});

type GoalSubmitData = Pick<
  Database['goal'],
  | 'title'
  | 'target'
  | 'unit'
  | 'startDate'
  | 'targetDate'
  | 'initialValue'
  | 'userId'
>;

async function handleSubmit(
  {
    title,
    target,
    unit,
    startDate,
    targetDate,
    initialValue,
    userId,
  }: GoalSubmitData,
  callback?: () => void,
) {
  const { uuid, shortUuid } = generateUUIDs();

  try {
    await db
      .insertInto('goal')
      .values({
        id: uuid,
        shortId: shortUuid as string,
        title,
        currentValue: initialValue,
        initialValue,
        target: target,
        unit,
        userId,
        startDate: startDate,
        targetDate: targetDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .executeTakeFirstOrThrow();

    toast.success('Sucessfully added goal');
    callback && callback();
  } catch (error) {
    console.error(error);
    toast.error('Failed to add goal');
  }
}

function NewGoalDialog() {
  const navigate = useNavigate();
  const user = useUser();
  const handleClose = () => {
    void navigate({ from: '/goals/new', to: '/goals', replace: true });
  };

  interface NewGoal {
    title: string;
    targetValue?: number;
    unit: string;
    startDate: Date;
    targetDate?: Date;
    initialValue: number;
  }

  const form = useForm<NewGoal>({
    defaultValues: {
      title: '',
      targetValue: 0,
      unit: '',
      startDate: new Date(),
      targetDate: undefined,
      initialValue: 0,
    },
    validators: {
      onChange({ value }) {
        const { title, targetValue, targetDate } = value;
        if (!title || !targetValue || !targetDate) {
          return 'Missing required fields';
        }
      },
    },
    onSubmit: async ({ value }) => {
      const { startDate, targetDate, targetValue } = value;
      if (!targetDate || !user || !targetValue) {
        return;
      }
      const stringStartDate = startDate.toISOString();
      const stringTargetDate = targetDate.toISOString();
      await handleSubmit(
        {
          ...value,
          title: value.title.trim(),
          unit: value.unit.trim(),
          target: targetValue,
          userId: user.id,
          startDate: stringStartDate,
          targetDate: stringTargetDate,
        },
        handleClose,
      );
    },
  });

  const {
    startTimeout: delayedValidation,
    clearExistingTimeout: clearTimeout,
  } = useDelayedExecution(() => void form.validateAllFields('change'));

  return (
    <Dialog
      open={true}
      onOpenChange={() => {
        handleClose();
      }}
    >
      <DialogContent className="sm:max-w-screen-sm">
        <DialogHeader>
          <DialogTitle>Add new goal</DialogTitle>
          <DialogDescription>
            Set up your new goal. You can always edit it later.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="grid gap-4 py-4"
        >
          <FormItem label="Goal name" labelFor="title" required>
            <form.Field
              name="title"
              validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) return 'Choose a name for your goal.';
                  return (
                    maxLengthValidator(
                      value,
                      MAX_GOAL_NAME_LENGTH,
                      'Goal name',
                    ) || undefined
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
                        placeholder="eg. 'Learn a 1000 Japanese words'"
                        maxLength={100}
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.Field>
          </FormItem>
          <FormItem label="Target value" labelFor="target-value" required>
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
                        value={value?.toString()}
                        onKeyDown={(e) => blockNonNumberInput(e)}
                        onChange={(e) => {
                          parseInputtedNumber(
                            e.target.value,
                            field.handleChange,
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
          <FormItem label="Target date" labelFor="targe-date" required>
            <form.Field
              name="targetDate"
              validators={{
                onChangeListenTo: ['startDate'],
                onChange: ({ value, fieldApi }) => {
                  if (
                    value &&
                    value < fieldApi.form.getFieldValue('startDate')
                  ) {
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
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.Field>
          </FormItem>
          <FormItem label="Start date" labelFor="start-date" required>
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
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.Field>
          </FormItem>
          <FormItem label="Unit" labelFor="unit">
            <form.Field
              name="unit"
              validators={{
                onChange: ({ value }) => {
                  return (
                    maxLengthValidator(value, MAX_UNIT_LENGTH, 'Unit') ||
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
          <FormItem label="Initial value" labelFor="initial-value">
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
                        value={value.toString()}
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
          <DialogFooter className="mt-4 grid grid-cols-4 justify-items-end gap-4">
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
                  className={cn('col-start-3', {
                    'cursor-not-allowed': isSubmitDisabled,
                  })}
                >
                  <Button type="submit" disabled={isSubmitDisabled}>
                    {isSubmitting && (
                      <LoaderCircleIcon
                        size={18}
                        className="mr-2 animate-spin"
                      />
                    )}
                    Create goal
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default NewGoalDialog;
