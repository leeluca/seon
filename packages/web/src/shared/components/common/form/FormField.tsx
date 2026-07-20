import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ValidationError } from '@tanstack/react-form';

import FormItem from '~/shared/components/common/FormItem';
import { cn } from '~/utils';
import FormError from './FormError';

export interface FormLayoutProps {
  itemClassName?: string;
  labelClassName?: string;
  controlClassName?: string;
  errorClassName?: string;
}

const FormLayoutContext = createContext<FormLayoutProps>({});

export function FormLayout({
  children,
  itemClassName,
  labelClassName,
  controlClassName,
  errorClassName,
}: FormLayoutProps & { children: ReactNode }) {
  const parentLayout = useContext(FormLayoutContext);
  const value = useMemo(
    () => ({
      itemClassName: itemClassName ?? parentLayout.itemClassName,
      labelClassName: labelClassName ?? parentLayout.labelClassName,
      controlClassName: controlClassName ?? parentLayout.controlClassName,
      errorClassName: errorClassName ?? parentLayout.errorClassName,
    }),
    [
      parentLayout,
      itemClassName,
      labelClassName,
      controlClassName,
      errorClassName,
    ],
  );

  return (
    <FormLayoutContext.Provider value={value}>
      {children}
    </FormLayoutContext.Provider>
  );
}

interface FormFieldProps extends FormLayoutProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  errors: (ValidationError | null | undefined)[];
  children: ReactNode;
}

export function FormField({
  id,
  label,
  required,
  errors,
  children,
  itemClassName,
  labelClassName,
  controlClassName,
  errorClassName,
}: FormFieldProps) {
  const layout = useContext(FormLayoutContext);
  const errorId = `${id}-error`;

  return (
    <FormItem
      label={label}
      labelFor={id}
      required={required}
      className={cn(layout.itemClassName, itemClassName)}
      labelClassName={labelClassName ?? layout.labelClassName}
    >
      <div className={controlClassName ?? layout.controlClassName}>
        {children}
      </div>
      <FormError
        id={errorId}
        className={errorClassName ?? layout.errorClassName}
        errors={errors}
      />
    </FormItem>
  );
}
