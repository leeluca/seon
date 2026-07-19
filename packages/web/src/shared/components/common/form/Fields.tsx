import {
  useId,
  type ChangeEventHandler,
  type FocusEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import type { ValidationError } from '@tanstack/react-form';

import { DatePicker } from '~/shared/components/common/DatePicker';
import FormError from '~/shared/components/common/form/FormError';
import { Input } from '~/shared/components/ui/input';
import { NumberInput } from '~/shared/components/ui/number-input';
import { useFieldContext } from '~/states/formContext';
import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';
import { FormField, type FormLayoutProps } from './FormField';

interface FieldPresentationProps extends FormLayoutProps {
  label?: ReactNode;
  required?: boolean;
  additionalErrors?: (ValidationError | null | undefined)[];
}

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue'>,
    FieldPresentationProps {}

export function TextField(props: TextFieldProps) {
  const field = useFieldContext<string>();
  const generatedId = useId();
  const {
    id: idProp,
    label,
    required,
    additionalErrors = [],
    itemClassName,
    labelClassName,
    controlClassName,
    errorClassName,
    onChange,
    onBlur,
    type = 'text',
    ...inputProps
  } = props;
  const id = idProp ?? generatedId;
  const errors = [...field.state.meta.errors, ...additionalErrors];
  const input = (
    <Input
      {...inputProps}
      id={id}
      name={field.name}
      type={type}
      required={required}
      value={field.state.value}
      onChange={(event) => {
        field.handleChange(event.target.value);
        onChange?.(event);
      }}
      onBlur={(event) => {
        field.handleBlur();
        onBlur?.(event);
      }}
      aria-invalid={errors.some(Boolean) || undefined}
      aria-describedby={errors.some(Boolean) ? `${id}-error` : undefined}
    />
  );

  if (label === undefined) {
    return input;
  }

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      errors={errors}
      itemClassName={itemClassName}
      labelClassName={labelClassName}
      controlClassName={controlClassName}
      errorClassName={errorClassName}
    >
      {input}
    </FormField>
  );
}

interface NumberFieldProps extends FieldPresentationProps {
  id?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  buttonStacked?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  className?: string;
  helperText?: string;
  customButton?: React.ReactNode;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

export function NumberField(props: NumberFieldProps) {
  const field = useFieldContext<number | undefined>();
  const generatedId = useId();
  const isMobile = useViewportStore((state) => state.isMobile);
  const {
    id: idProp,
    label,
    required,
    additionalErrors = [],
    itemClassName,
    labelClassName,
    controlClassName,
    errorClassName,
    placeholder,
    min,
    max,
    buttonStacked = !isMobile,
    autoFocus,
    autoComplete,
    className,
    helperText,
    customButton,
    onBlur,
    onChange,
  } = props;
  const id = idProp ?? generatedId;
  const errors = [...field.state.meta.errors, ...additionalErrors];

  const input = (
    <div className="relative">
      {helperText && (
        <span
          className={cn(
            'text-muted-foreground pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 transform text-xs',
            buttonStacked ? 'left-2' : 'left-14',
          )}
        >
          {helperText}
        </span>
      )}
      <NumberInput.Root
        value={field.state.value}
        onChange={(e) => {
          field.handleChange(
            e.target.value === '' ? undefined : Number(e.target.value),
          );
          onChange?.(e);
        }}
        min={min}
        max={max}
        buttonStacked={buttonStacked}
      >
        {buttonStacked ? (
          <>
            <div className="relative flex-1">
              <NumberInput.Field
                id={id}
                name={field.name}
                required={required}
                autoFocus={autoFocus}
                autoComplete={autoComplete}
                placeholder={placeholder}
                onBlur={(event) => {
                  field.handleBlur();
                  onBlur?.(event);
                }}
                aria-invalid={errors.some(Boolean) || undefined}
                aria-describedby={
                  errors.some(Boolean) ? `${id}-error` : undefined
                }
                className={cn(
                  helperText && 'pl-[39px]',
                  customButton && 'pr-[52px]',
                  className,
                )}
              />
              {customButton && (
                <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2 transform">
                  {customButton}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <NumberInput.Button direction="inc" />
              <NumberInput.Button direction="dec" />
            </div>
          </>
        ) : (
          <>
            <NumberInput.Button direction="dec" className="rounded-r-none" />
            <div className="relative flex-1">
              <NumberInput.Field
                id={id}
                name={field.name}
                required={required}
                autoFocus={autoFocus}
                autoComplete={autoComplete}
                placeholder={placeholder}
                onBlur={(event) => {
                  field.handleBlur();
                  onBlur?.(event);
                }}
                aria-invalid={errors.some(Boolean) || undefined}
                aria-describedby={
                  errors.some(Boolean) ? `${id}-error` : undefined
                }
                className={cn(
                  'rounded-none',
                  helperText && 'pl-[39px]',
                  customButton && 'pr-[52px]',
                  className,
                )}
              />
              {customButton && (
                <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2 transform">
                  {customButton}
                </div>
              )}
            </div>
            <NumberInput.Button direction="inc" className="rounded-l-none" />
          </>
        )}
      </NumberInput.Root>
    </div>
  );

  if (label === undefined) {
    return input;
  }

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      errors={errors}
      itemClassName={itemClassName}
      labelClassName={labelClassName}
      controlClassName={controlClassName}
      errorClassName={errorClassName}
    >
      {input}
    </FormField>
  );
}

interface DateFieldProps extends FieldPresentationProps {
  id?: string;
  defaultDate?: Date;
  readOnly?: boolean;
  showPresetDates?: boolean;
}

export function DateField(props: DateFieldProps) {
  const field = useFieldContext<Date | undefined>();
  const generatedId = useId();
  const {
    id: idProp,
    label,
    required,
    additionalErrors = [],
    itemClassName,
    labelClassName,
    controlClassName,
    errorClassName,
    defaultDate,
    readOnly,
    showPresetDates,
  } = props;
  const id = idProp ?? generatedId;
  const errors = [...field.state.meta.errors, ...additionalErrors];
  const input = (
    <DatePicker
      id={id}
      defaultDate={defaultDate}
      date={field.state.value}
      setDate={(date) => date && field.handleChange(date)}
      readOnly={readOnly}
      showPresetDates={showPresetDates}
      ariaInvalid={errors.some(Boolean) || undefined}
      ariaDescribedBy={errors.some(Boolean) ? `${id}-error` : undefined}
    />
  );

  if (label === undefined) {
    return input;
  }

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      errors={errors}
      itemClassName={itemClassName}
      labelClassName={labelClassName}
      controlClassName={controlClassName}
      errorClassName={errorClassName}
    >
      {input}
    </FormField>
  );
}

export function ErrorInfo(props: {
  className?: string;
  textClassName?: string;
}) {
  const field = useFieldContext<unknown>();
  const {
    state: {
      meta: { errors },
    },
  } = field;
  return (
    <FormError
      className={props.className}
      textClassName={props.textClassName}
      errors={errors}
    />
  );
}
