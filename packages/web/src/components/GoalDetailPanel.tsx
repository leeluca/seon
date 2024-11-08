import type { Database } from '~/lib/powersync/AppSchema';
import type { ReactElement } from 'react';

import { useState } from 'react';
import { useQuery } from '@powersync/react';
import { useForm } from '@tanstack/react-form';
// import { format } from 'date-fns';
import { PencilIcon, SaveIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  // SheetTrigger,
} from '~/components/ui/sheet';
import db from '~/lib/database';
import GoalForm, { GOAL_FORM_ID } from './GoalForm';
import { Button } from './ui/button';

async function handleUpdate(
  goalId: string,
  {
    title,
    target,
    unit,
    startDate,
    targetDate,
    initialValue,
  }: Pick<
    Database['goal'],
    'title' | 'target' | 'unit' | 'startDate' | 'targetDate' | 'initialValue'
  >,
  callback?: () => void,
) {
  try {
    await db
      .updateTable('goal')
      .set({
        title,
        currentValue: initialValue,
        initialValue,
        target: target,
        unit,
        startDate: startDate,
        targetDate: targetDate,
        updatedAt: new Date().toISOString(),
      })
      .where('id', '=', goalId)
      .executeTakeFirstOrThrow();

    toast.success('Sucessfully updated goal');
    callback && callback();
  } catch (error) {
    console.error(error);
    toast.error('Failed to update goal');
  }
}

// FIXME: fix types
// TODO: move outside of goal component and have a single instance of this component
interface GoalDetailPanelProps {
  child?: ReactElement;
  description?: string;
  // FIXME: temporary, won't receive as prop
  // graphComponent: JSX.Element;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  selectedGoalId: string;
  // goal: Database['goal'];
}
export function GoalDetailPanel({
  open,
  onOpenChange,
  // description,
  // graphComponent,
  selectedGoalId,
  // goal,
}: GoalDetailPanelProps) {
  // const { selectedGoal } = useSelectedGoal();

  const [isEditing, setIsEditing] = useState(false);
  interface NewGoal {
    title: string;
    targetValue?: number;
    unit: string;
    startDate: Date;
    targetDate?: Date;
    initialValue: number;
  }

  const {
    data: [selectedGoal],
    isLoading,
  } = useQuery(
    db
      .selectFrom('goal')
      .selectAll()
      .where('shortId', '=', selectedGoalId)
      .limit(1),
  );

  const {
    title,
    target,
    targetDate,
    startDate,
    description,
    unit,
    id: goalId,
  } = selectedGoal || {};

  const form = useForm<NewGoal>({
    defaultValues: {
      title,
      targetValue: target,
      unit: unit,
      startDate: startDate ? new Date(startDate) : new Date(),
      targetDate: targetDate ? new Date(targetDate) : new Date(),
      // startDate: new Date(),
      // targetDate: new Date(),

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
      if (!targetDate || !targetValue) {
        return;
      }
      const stringStartDate = startDate.toISOString();
      const stringTargetDate = targetDate.toISOString();

      await handleUpdate(goalId, {
        ...value,
        target: targetValue,
        startDate: stringStartDate,
        targetDate: stringTargetDate,
      });
    },
  });

  if (!selectedGoal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* <SheetTrigger asChild>{child}</SheetTrigger> */}
      <SheetContent className="!w-full !max-w-full sm:!max-w-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {/* {graphComponent} */}
        <section className="my-6">
          <div className="flex items-center justify-end">
            <p className="text-muted-foreground mr-2 text-xs">
              {/* Last updated at: {format(updatedAt, 'PPpp')} */}
            </p>
            {isEditing ? (
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    form.reset();
                  }}
                  aria-label="Cancel editing"
                >
                  <XIcon />
                </Button>
                <form.Subscribe
                  selector={(state) => [
                    state.isSubmitting,
                    !state.isDirty || !state.canSubmit || state.isSubmitting,
                  ]}
                >
                  {([isSubmitting, isSubmitDisabled]) => (
                    <div
                      className={isSubmitDisabled ? 'cursor-not-allowed' : ''}
                    >
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Save"
                        form={GOAL_FORM_ID}
                        onClick={() => {
                          setIsEditing(false);
                        }}
                        disabled={isSubmitDisabled || isSubmitting}
                      >
                        <SaveIcon />
                      </Button>
                    </div>
                  )}
                </form.Subscribe>
              </div>
            ) : (
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsEditing(true)}
                aria-label="Edit"
              >
                <PencilIcon />
              </Button>
            )}
          </div>
          {/* <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="grid gap-4 py-4"
          >
            <FormItem label="Goal name" labelFor="title" className="block">
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
                          readOnly={!isEditing}
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
              className="block"
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
                          readOnly={!isEditing}
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
              className="block"
            >
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
                          readOnly={!isEditing}
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
              className="block"
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
                          readOnly={!isEditing}
                        />
                      </div>
                    </FormError.Wrapper>
                  );
                }}
              </form.Field>
            </FormItem>
            <FormItem label="Unit" labelFor="unit" className="block">
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
                          readOnly={!isEditing}
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
              className="block"
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
                          readOnly={!isEditing}
                        />
                      </div>
                    </FormError.Wrapper>
                  );
                }}
              </form.Field>
            </FormItem>
          </form> */}
          <GoalForm form={form} formItemClassName="block" />
        </section>
        <SheetFooter>
          <SheetClose asChild></SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
