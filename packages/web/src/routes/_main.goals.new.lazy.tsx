import { useForm } from '@tanstack/react-form';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import { DatePicker } from '~/components/DatePicker';
import FormError from '~/components/FormError';
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
import { Label } from '~/components/ui/label';
import { MAX_INPUT_NUMBER } from '~/constants';
import db from '~/lib/database';
import { Database } from '~/lib/powersync/AppSchema';
import { useUser } from '~/states/userContext';
import { generateUUIDs } from '~/utils';
import { blockNonNumberInput, parseInputtedNumber } from '~/utils/validation';

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

async function handleSubmit({
  title,
  target,
  unit,
  startDate,
  targetDate,
  initialValue,
  userId,
  callback,
}: GoalSubmitData & { callback?: () => void }) {
  const { uuid, shortUuid } = generateUUIDs();
  console.log({
    title,
    target,
    unit,
    startDate,
    targetDate,
    initialValue,
    userId,
  });
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
        unit: unit,
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
      await handleSubmit({
        ...value,
        target: targetValue,
        userId: user.id,
        startDate: stringStartDate,
        targetDate: stringTargetDate,
        callback: handleClose,
      });
    },
  });

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
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label htmlFor="title" className="text-right">
              Goal name <span className="text-red-400"> * </span>
            </Label>
            <form.Field
              name="title"
              validators={{
                onChange: ({ value }) =>
                  !value && 'Choose a name for your goal.',
              }}
            >
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <>
                    <div className="col-span-2">
                      <Input
                        value={value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="eg. 'Learn a 1000 Japanese words'"
                      />
                    </div>
                    <FormError
                      className="col-span-3 col-start-2"
                      errors={errors}
                    />
                  </>
                );
              }}
            </form.Field>
          </div>
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label htmlFor="targetValue" className="text-right">
              Target value <span className="text-red-400"> * </span>
            </Label>
            <form.Field
              name="targetValue"
              validators={{
                onChange: ({ value }) =>
                  !value && 'Choose a target value for your goal.',
              }}
            >
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={value}
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
                    <FormError
                      className="col-span-3 col-start-2"
                      errors={errors}
                    />
                  </>
                );
              }}
            </form.Field>
          </div>
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label htmlFor="startDate" className="text-right">
              Target date <span className="text-red-400"> * </span>
            </Label>
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
                  return undefined;
                },
              }}
            >
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <>
                    <div className="col-span-2">
                      <DatePicker
                        date={value}
                        setDate={(date) => date && field.handleChange(date)}
                      />
                    </div>
                    <FormError
                      className="col-span-3 col-start-2"
                      errors={errors}
                    />
                  </>
                );
              }}
            </form.Field>
          </div>

          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label htmlFor="startDate" className="text-right">
              Start date
            </Label>
            <form.Field name="startDate">
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <>
                    <div className="col-span-2">
                      <DatePicker
                        defaultDate={new Date()}
                        date={value}
                        setDate={(date) => date && field.handleChange(date)}
                      />
                    </div>
                    <FormError
                      className="col-span-3 col-start-2"
                      errors={errors}
                    />
                  </>
                );
              }}
            </form.Field>
          </div>
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label htmlFor="unit" className="text-right">
              Unit
            </Label>
            <form.Field name="unit">
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <>
                    <div className="col-span-2">
                      <Input
                        value={value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. words"
                      />
                    </div>
                    <FormError
                      className="col-span-3 col-start-2"
                      errors={errors}
                    />
                  </>
                );
              }}
            </form.Field>
          </div>

          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label htmlFor="initialValue" className="text-right">
              Initial value
            </Label>
            <form.Field name="initialValue">
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={value}
                        onKeyDown={(e) => blockNonNumberInput(e)}
                        onChange={(e) => {
                          parseInputtedNumber(
                            e.target.value,
                            (parsedNumber?: number) => {
                              if (parsedNumber && !Number.isNaN(parsedNumber)) {
                                field.handleChange(parsedNumber);
                              }
                            },
                          );
                        }}
                        placeholder="Numbers only"
                        min={0}
                        max={MAX_INPUT_NUMBER}
                      />
                    </div>
                    <FormError
                      className="col-span-3 col-start-2"
                      errors={errors}
                    />
                  </>
                );
              }}
            </form.Field>
          </div>
          <DialogFooter className="mt-4 grid grid-cols-4 items-center gap-4">
            <form.Subscribe
              selector={(state) => [
                state.canSubmit,
                state.isSubmitting,
                state.isTouched,
              ]}
            >
              {([canSubmit, isSubmitting, isTouched]) => (
                <Button
                  type="submit"
                  disabled={!isTouched || !canSubmit || isSubmitting}
                  className="col-start-3"
                >
                  {isSubmitting && (
                    <LoaderCircleIcon size={18} className="mr-2 animate-spin" />
                  )}
                  Save changes
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default NewGoalDialog;
