import type { ValidationError } from '@tanstack/react-form';

import { cn } from '~/utils';

interface FormErrorProps {
  errors: ValidationError[];
  textClassName?: string;
}
function FormError({
  errors,
  className,
  textClassName,
}: FormErrorProps & { className?: string }) {
  const hasErrors = errors.length;

  if (!hasErrors) {
    return null;
  }

  return (
    <div className={className}>
      {errors.map((error) => (
        <p
          className={cn(
            'text-destructive text-[0.8rem] font-medium',
            textClassName,
          )}
        >
          {error}
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
}: FormErrorProps & { errorClassName?: string; children: React.ReactNode }) {
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
