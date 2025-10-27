import type {
  FocusEvent,
  HTMLInputTypeAttribute,
  InputHTMLAttributes,
} from 'react';

import { DatePicker } from '~/components/DatePicker';
import FormError from '~/components/form/FormError';
import { Input } from '~/components/ui/input';
import { useFieldContext } from '~/states/formContext';

interface TextFieldProps {
  id?: string;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
}

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
    />
  );
}

export function NumberField(props: {
  id?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  const field = useFieldContext<number | undefined>();
  const { id, placeholder, min, max } = props;
  return (
    <Input
      id={id}
      type="number"
      value={field.state.value?.toString() || ''}
      onChange={(e) => field.handleChange(Number(e.target.value))}
      placeholder={placeholder}
      min={min}
      max={max}
    />
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
