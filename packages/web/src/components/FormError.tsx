import type { ValidationError } from '@tanstack/react-form';

import { cn } from '~/utils';

interface FormMessageProps {
  errors: ValidationError[];
  className?: string;
  textClassName?: string;
}
function FormError({ errors, className, textClassName }: FormMessageProps) {
  const hasErrors = errors.length;

  if (!hasErrors) {
    return null;
  }

  return (
    <div className={className}>
      {errors.map((error) => (
        <p
          key={error as string}
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

export default FormError;
