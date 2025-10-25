import { useCallback, useId, useRef, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { isSameDay } from 'date-fns';
import { ChevronRightIcon } from 'lucide-react';

import { DatePicker } from '~/components/DatePicker';
import FormError from '~/components/FormError';
import FormItem from '~/components/FormItem';
import { Input } from '~/components/ui/input';
import {
  MAX_GOAL_NAME_LENGTH,
  MAX_INPUT_NUMBER,
  MAX_UNIT_LENGTH,
} from '~/constants';
import { withForm } from '~/hooks/form';
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/types/goal';
import { cn } from '~/utils';
import {
  blockNonNumberInput,
  maxLengthValidator,
  parseInputtedNumber,
} from '~/utils/validation';
import { Button } from './ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ResponsiveTooltip } from './ui/responsive-tooltip';

export const GOAL_FORM_ID = 'goal-form';

export interface NewGoal {
  title: string;
  targetValue?: number;
  unit: string;
  startDate: Date;
  targetDate?: Date;
  initialValue: number;
  type: GoalType;
}

interface NewGoalFormProps {
  className?: string;
  formItemClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  collapseOptionalFields?: boolean;
  autoFocus?: boolean;
}
const GoalForm = withForm({
  // Only used for type inference; not executed
  defaultValues: {
    title: '',
    targetValue: 0,
    unit: '',
    startDate: new Date(),
    targetDate: undefined,
    initialValue: 0,
    type: 'COUNT' as GoalType,
  } as NewGoal,
  props: {
    className: undefined,
    formItemClassName: undefined,
    labelClassName: undefined,
    errorClassName: undefined,
    collapseOptionalFields: false,
    autoFocus: false,
  } as NewGoalFormProps,
  render: function Render({
    form,
    className,
    formItemClassName,
    labelClassName,
    errorClassName,
    collapseOptionalFields = false,
    autoFocus = false,
  }) {
    const [showOptionalFields, setShowOptionalFields] = useState(
      !collapseOptionalFields,
    );
    const { t } = useLingui();
    const iconRefs = useRef<SVGSVGElement[]>([]);
    const setIconRef = useCallback((node: SVGSVGElement | null) => {
      if (node && !iconRefs.current.includes(node)) {
        iconRefs.current.push(node);
      }
    }, []);
    const isMobile = useViewportStore((state) => state.isMobile);
    const uid = useId();

    const id = {
      title: `${uid}-title`,
      targetValue: `${uid}-target-value`,
      targetDate: `${uid}-target-date`,
      typeCount: `${uid}-r1`,
      typeProgress: `${uid}-r2`,
      typeBoolean: `${uid}-r3`,
      startDate: `${uid}-start-date`,
      unit: `${uid}-unit`,
      initialValue: `${uid}-initial-value`,
      toggleExtra: `${uid}-toggle-extra-options`,
    };

    return (
      <form.AppForm>
        <form
          id={GOAL_FORM_ID}
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className={cn('grid gap-5 py-4', className)}
        >
          <FormItem
            label={t`Goal name`}
            labelFor={id.title}
            className={formItemClassName}
            labelClassName={labelClassName}
            required
          >
            <form.AppField
              name="title"
              validators={{
                onChange: ({ value }: { value: string }) => {
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
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <FormError.Wrapper
                    errors={errors}
                    errorClassName={errorClassName}
                  >
                    <div className="col-span-1">
                      <Input
                        id={id.title}
                        value={value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={t`eg. 'Learn 1000 French words'`}
                        maxLength={100}
                        autoFocus={autoFocus}
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.AppField>
          </FormItem>
          <FormItem
            label={t`Target value`}
            labelFor={id.targetValue}
            required
            className={formItemClassName}
            labelClassName={labelClassName}
          >
            <form.AppField
              name="targetValue"
              validators={{
                onChange: ({ value }: { value?: number }) =>
                  !value && t`Set a target value for your goal.`,
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
                    errorClassName={errorClassName}
                  >
                    <div className="col-span-1">
                      <Input
                        id={id.targetValue}
                        type="number"
                        // Removes leading zeros
                        value={value?.toString() || ''}
                        onKeyDown={(e) => blockNonNumberInput(e)}
                        onChange={(e) => {
                          parseInputtedNumber(
                            e.target.value,
                            field.handleChange,
                          );
                        }}
                        placeholder={t`Value for goal completion (number)`}
                        min={0}
                        max={MAX_INPUT_NUMBER}
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.AppField>
          </FormItem>
          <FormItem
            label={t`Target date`}
            labelFor={id.targetDate}
            required
            className={formItemClassName}
            labelClassName={labelClassName}
          >
            <form.AppField
              name="targetDate"
              validators={{
                onChangeListenTo: ['startDate'],
                onChange: ({ value }: { value?: Date }) => {
                  if (
                    value &&
                    !isSameDay(value, form.getFieldValue('startDate')) &&
                    value < form.getFieldValue('startDate')
                  ) {
                    return t`Target date must be after start date`;
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
                    errorClassName={errorClassName}
                  >
                    <div className="col-span-1">
                      <DatePicker
                        id={id.targetDate}
                        date={value}
                        setDate={(date) => date && field.handleChange(date)}
                        showPresetDates
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.AppField>
          </FormItem>
          <FormItem
            label={t`Type`}
            labelFor="type"
            required
            className={cn(formItemClassName, 'min-h-9')}
            labelClassName={labelClassName}
          >
            <form.AppField name="type">
              {(field) => {
                const {
                  value,
                  meta: { errors },
                } = field.state;
                return (
                  <FormError.Wrapper
                    errors={errors}
                    errorClassName={errorClassName}
                  >
                    <RadioGroup
                      defaultValue="COUNT"
                      orientation="horizontal"
                      className="col-span-1 flex flex-row flex-wrap gap-4 sm:gap-2"
                      value={value}
                      // TODO: validate type on runtime?
                      onValueChange={(value) =>
                        field.handleChange(value as GoalType)
                      }
                    >
                      <div className="flex items-center">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="COUNT" id={id.typeCount} />
                          <Label htmlFor={id.typeCount}>
                            <Trans>Count</Trans>
                          </Label>
                        </div>
                        <ResponsiveTooltip
                          contentClassName="max-w-[90%]"
                          content={
                            <p className="break-keep">
                              <Trans>
                                Track how many times you complete something each
                                day.
                                <br />
                                E.g. '30 minutes of exercise' or 'drink 8
                                glasses of water'.
                              </Trans>
                            </p>
                          }
                          side={isMobile ? 'top' : 'bottom'}
                        >
                          <InfoCircledIcon
                            ref={setIconRef}
                            height={isMobile ? 18 : 16}
                            width={isMobile ? 18 : 16}
                            className="ml-1 sm:mb-2"
                          />
                        </ResponsiveTooltip>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem
                            value="PROGRESS"
                            id={id.typeProgress}
                          />
                          <Label htmlFor={id.typeProgress}>
                            <Trans>Progress</Trans>
                          </Label>
                        </div>
                        <ResponsiveTooltip
                          contentClassName="max-w-[90%]"
                          content={
                            <p className="break-keep">
                              <Trans>
                                Track your overall progress towards a target.
                                <br />
                                E.g. reading a book (current page) or saving
                                money (total amount saved).
                              </Trans>
                            </p>
                          }
                          side={isMobile ? 'top' : 'bottom'}
                        >
                          <InfoCircledIcon
                            width={isMobile ? 18 : 16}
                            height={isMobile ? 18 : 16}
                            className="ml-1 sm:mb-2"
                          />
                        </ResponsiveTooltip>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="BOOLEAN" id={id.typeBoolean} />
                          <Label htmlFor={id.typeBoolean}>
                            <p className="text-pretty">
                              <Trans>Yes or no</Trans>
                            </p>
                          </Label>
                        </div>
                        <ResponsiveTooltip
                          contentClassName="max-w-[90%]"
                          content={
                            <p className="break-keep">
                              <Trans>
                                Track daily completion with a simple yes or no.
                                <br />
                                E.g. habits like meditation or taking vitamins.
                              </Trans>
                            </p>
                          }
                          side={isMobile ? 'top' : 'bottom'}
                        >
                          <InfoCircledIcon
                            ref={setIconRef}
                            width={isMobile ? 20 : 16}
                            height={isMobile ? 20 : 16}
                            className="ml-1 sm:mb-2"
                          />
                        </ResponsiveTooltip>
                      </div>
                    </RadioGroup>
                  </FormError.Wrapper>
                );
              }}
            </form.AppField>
          </FormItem>
          <Collapsible
            open={showOptionalFields}
            onOpenChange={setShowOptionalFields}
          >
            {collapseOptionalFields && (
              <div className="my-2 flex items-center gap-1">
                <CollapsibleTrigger asChild className="mr-2">
                  <Button
                    size="icon-responsive"
                    variant="ghost"
                    type="button"
                    id={id.toggleExtra}
                    className="sm:-ml-2"
                  >
                    <ChevronRightIcon
                      size={18}
                      className={`transform transition-transform duration-300 ${
                        showOptionalFields ? 'rotate-90' : 'rotate-0'
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                {showOptionalFields ? (
                  <label
                    className="flex text-right text-sm font-medium sm:text-xs"
                    htmlFor={id.toggleExtra}
                  >
                    <Trans>Hide extra options</Trans>
                  </label>
                ) : (
                  <label
                    className="flex text-right text-sm font-medium sm:text-xs"
                    htmlFor={id.toggleExtra}
                  >
                    <Trans>Show extra options</Trans>
                  </label>
                )}
              </div>
            )}

            <CollapsibleContent>
              <div className="my-px grid gap-4">
                <FormItem
                  label={t`Start date`}
                  labelFor={id.startDate}
                  className={formItemClassName}
                  labelClassName={labelClassName}
                >
                  <form.AppField name="startDate">
                    {(field) => {
                      const {
                        value,
                        meta: { errors },
                      } = field.state;
                      return (
                        <FormError.Wrapper
                          errors={errors}
                          errorClassName={errorClassName}
                        >
                          <div className="col-span-1">
                            <DatePicker
                              id={id.startDate}
                              defaultDate={new Date()}
                              date={value}
                              setDate={(date) =>
                                date && field.handleChange(date)
                              }
                              showPresetDates
                            />
                          </div>
                        </FormError.Wrapper>
                      );
                    }}
                  </form.AppField>
                </FormItem>
                <FormItem
                  label={t`Unit`}
                  labelFor={id.unit}
                  className={formItemClassName}
                  labelClassName={labelClassName}
                >
                  <form.AppField
                    name="unit"
                    validators={{
                      onChange: ({ value }: { value: string }) => {
                        return (
                          maxLengthValidator(value, MAX_UNIT_LENGTH, t`Unit`) ||
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
                          errorClassName={errorClassName}
                        >
                          <div className="col-span-1">
                            <Input
                              id={id.unit}
                              value={value}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              placeholder={t`e.g. words`}
                              maxLength={100}
                            />
                          </div>
                        </FormError.Wrapper>
                      );
                    }}
                  </form.AppField>
                </FormItem>
                <FormItem
                  label={t`Initial value`}
                  labelFor={id.initialValue}
                  className={formItemClassName}
                  labelClassName={labelClassName}
                >
                  <form.AppField name="initialValue">
                    {(field) => {
                      const {
                        value,
                        meta: { errors },
                      } = field.state;
                      return (
                        <FormError.Wrapper
                          errors={errors}
                          errorClassName={errorClassName}
                        >
                          <div className="col-span-1">
                            <Input
                              id={id.initialValue}
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
                              placeholder={t`Numbers only`}
                              min={0}
                              max={MAX_INPUT_NUMBER}
                            />
                          </div>
                        </FormError.Wrapper>
                      );
                    }}
                  </form.AppField>
                </FormItem>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </form>
      </form.AppForm>
    );
  },
});

export default GoalForm;
