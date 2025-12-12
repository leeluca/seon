import type { ReactNode } from 'react';
import type { ValidationError } from '@tanstack/react-form';

import { cn } from '~/utils';

interface FormErrorProps {
  errors: (ValidationError | null | undefined)[];
  textClassName?: string;
}

const normalizeErrors = (
  errors: (ValidationError | null | undefined)[],
): string[] => {
  return errors
    .map((error) => {
      if (error == null) return undefined;
      if (error instanceof Error) return error.message;
      if (typeof error === 'string') return error;
      return String(error);
    })
    .filter((message): message is string => Boolean(message));
};

function FormError({
  errors,
  className,
  textClassName,
}: FormErrorProps & { className?: string }) {
  const normalizedErrors = normalizeErrors(errors);

  if (!normalizedErrors.length) {
    return null;
  }

  return (
    <div className={className}>
      {normalizedErrors.map((message, index) => (
        <p
          key={`${message}-${
            // biome-ignore lint/suspicious/noArrayIndexKey: index is used to generate a unique key
            index
          }`}
          className={cn(
            'text-destructive text-[0.8rem] font-medium',
            textClassName,
          )}
        >
          {message}
        </p>
      ))}
    </div>
  );
}

function ErrorWrapper({
  errors,
  errorClassName,
  textClassName,
  children,
}: FormErrorProps & { errorClassName?: string; children: ReactNode }) {
  return (
    <>
      {children}
      <FormError
        className={errorClassName}
        textClassName={textClassName}
        errors={errors}
      />
    </>
  );
}

FormError.Wrapper = ErrorWrapper;

export default FormError;
