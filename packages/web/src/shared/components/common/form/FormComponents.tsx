import type { FormHTMLAttributes, ReactNode } from 'react';
import { LoaderCircleIcon } from 'lucide-react';

import { Button, type ButtonProps } from '~/shared/components/ui/button';
import { useFormContext } from '~/states/formContext';

export function FormRoot({
  children,
  ...props
}: Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>) {
  const form = useFormContext();

  return (
    <form
      {...props}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {children}
    </form>
  );
}

interface SubmitButtonProps extends Omit<ButtonProps, 'type'> {
  children: ReactNode;
  pendingLabel?: ReactNode;
  requireDirty?: boolean;
}

export function SubmitButton({
  children,
  pendingLabel,
  requireDirty = false,
  disabled,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}
    >
      {([canSubmit, isSubmitting, isDirty]) => (
        <Button
          type="submit"
          {...props}
          disabled={
            disabled || isSubmitting || !canSubmit || (requireDirty && !isDirty)
          }
        >
          {isSubmitting && (
            <LoaderCircleIcon size={14} className="animate-spin" />
          )}
          {isSubmitting && pendingLabel ? pendingLabel : children}
        </Button>
      )}
    </form.Subscribe>
  );
}
