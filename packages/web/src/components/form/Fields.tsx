import type { InputHTMLAttributes } from 'react';

import { DatePicker } from '~/components/DatePicker';
import FormError from '~/components/form/FormError';
import { Input } from '~/components/ui/input';
import { NumberInput } from '~/components/ui/number-input';
import { useFieldContext } from '~/states/formContext';
import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {}

export function TextField(props: TextFieldProps) {
  const field = useFieldContext<string>();
  const {
    id,
    placeholder,
    autoFocus,
    maxLength,
    type = 'text',
    autoComplete,
    inputMode,
    onBlur,
    disabled,
    readOnly,
    className,
  } = props;
  return (
    <Input
      id={id}
      type={type}
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      maxLength={maxLength}
      autoComplete={autoComplete}
      inputMode={inputMode}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      {...props}
    />
  );
}

export function NumberField(props: {
  id?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  buttonStacked?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  className?: string;
  helperText?: string;
}) {
  const field = useFieldContext<number | undefined>();
  const isMobile = useViewportStore((state) => state.isMobile);
  const {
    id,
    placeholder,
    min,
    max,
    buttonStacked = !isMobile,
    autoFocus,
    autoComplete,
    className,
    helperText,
  } = props;

  return (
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
          field.handleChange(Number(e.target.value));
        }}
        min={min}
        max={max}
        buttonStacked={buttonStacked}
      >
        {buttonStacked ? (
          <>
            <NumberInput.Field
              id={id}
              autoFocus={autoFocus}
              autoComplete={autoComplete}
              placeholder={placeholder}
              className={cn(helperText && 'pl-[39px]', className)}
            />
            <div className="flex flex-col">
              <NumberInput.Button direction="inc" />
              <NumberInput.Button direction="dec" />
            </div>
          </>
        ) : (
          <>
            <NumberInput.Button direction="dec" className="rounded-r-none" />
            <NumberInput.Field
              id={id}
              autoFocus={autoFocus}
              autoComplete={autoComplete}
              placeholder={placeholder}
              className={cn(
                'rounded-none',
                helperText && 'pl-[39px]',
                className,
              )}
            />
            <NumberInput.Button direction="inc" className="rounded-l-none" />
          </>
        )}
      </NumberInput.Root>
    </div>
  );
}

export function DateField(props: {
  id?: string;
  defaultDate?: Date;
  readOnly?: boolean;
  showPresetDates?: boolean;
}) {
  const field = useFieldContext<Date | undefined>();
  const { id, defaultDate, readOnly, showPresetDates } = props;
  return (
    <DatePicker
      id={id}
      defaultDate={defaultDate}
      date={field.state.value}
      setDate={(date) => date && field.handleChange(date)}
      readOnly={readOnly}
      showPresetDates={showPresetDates}
    />
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
