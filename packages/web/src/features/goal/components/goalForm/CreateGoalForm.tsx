import { useCallback, useRef, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { isSameDay } from 'date-fns';
import { ChevronRightIcon } from 'lucide-react';

import FormError from '~/components/form/FormError';
import FormItem from '~/components/FormItem';
import { Button } from '~/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { ResponsiveTooltip } from '~/components/ui/responsive-tooltip';
import {
  MAX_GOAL_NAME_LENGTH,
  MAX_INPUT_NUMBER,
  MAX_UNIT_LENGTH,
} from '~/constants';
import { useIds } from '~/hooks/useIds';
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/features/goal/model';
import { cn } from '~/utils';
import { maxLengthValidator } from '~/utils/validation';
import { GOAL_FIELD_SUFFIX, GOAL_FORM_ID } from '../../model';
import { withForm } from '../../hooks/useGoalForm';

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
const CreateGoalForm = withForm({
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

    const ids = useIds(GOAL_FIELD_SUFFIX);

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
            labelFor={ids.title}
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
                  meta: { errors },
                } = field.state;
                return (
                  <FormError.Wrapper
                    errors={errors}
                    errorClassName={errorClassName}
                  >
                    <div className="col-span-1">
                      <field.TextField
                        id={ids.title}
                        placeholder={t`eg. 'Learn 1000 French words'`}
                        autoFocus={autoFocus}
                        maxLength={100}
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.AppField>
          </FormItem>
          <FormItem
            label={t`Target value`}
            labelFor={ids.targetValue}
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
                  meta: { errors },
                } = field.state;
                return (
                  <FormError.Wrapper
                    errors={errors}
                    errorClassName={errorClassName}
                  >
                    <div className="col-span-1">
                      <field.NumberField
                        id={ids.targetValue}
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
            labelFor={ids.targetDate}
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
                  meta: { errors },
                } = field.state;
                return (
                  <FormError.Wrapper
                    errors={errors}
                    errorClassName={errorClassName}
                  >
                    <div className="col-span-1">
                      <field.DateField id={ids.targetDate} showPresetDates />
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
                          <RadioGroupItem value="COUNT" id={ids.typeCount} />
                          <Label htmlFor={ids.typeCount}>
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
                            id={ids.typeProgress}
                          />
                          <Label htmlFor={ids.typeProgress}>
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
                          <RadioGroupItem
                            value="BOOLEAN"
                            id={ids.typeBoolean}
                          />
                          <Label htmlFor={ids.typeBoolean}>
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
                    id={ids.toggleExtra}
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
                    htmlFor={ids.toggleExtra}
                  >
                    <Trans>Hide extra options</Trans>
                  </label>
                ) : (
                  <label
                    className="flex text-right text-sm font-medium sm:text-xs"
                    htmlFor={ids.toggleExtra}
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
                  labelFor={ids.startDate}
                  className={formItemClassName}
                  labelClassName={labelClassName}
                >
                  <form.AppField name="startDate">
                    {(field) => {
                      const {
                        meta: { errors },
                      } = field.state;
                      return (
                        <FormError.Wrapper
                          errors={errors}
                          errorClassName={errorClassName}
                        >
                          <div className="col-span-1">
                            <field.DateField
                              id={ids.startDate}
                              defaultDate={new Date()}
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
                  labelFor={ids.unit}
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
                        meta: { errors },
                      } = field.state;
                      return (
                        <FormError.Wrapper
                          errors={errors}
                          errorClassName={errorClassName}
                        >
                          <div className="col-span-1">
                            <field.TextField
                              id={ids.unit}
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
                  labelFor={ids.initialValue}
                  className={formItemClassName}
                  labelClassName={labelClassName}
                >
                  <form.AppField name="initialValue">
                    {(field) => {
                      const {
                        meta: { errors },
                      } = field.state;
                      return (
                        <FormError.Wrapper
                          errors={errors}
                          errorClassName={errorClassName}
                        >
                          <div className="col-span-1">
                            <field.NumberField
                              id={ids.initialValue}
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

export default CreateGoalForm;
