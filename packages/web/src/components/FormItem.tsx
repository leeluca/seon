import { Label } from '@radix-ui/react-label';

import { cn } from '~/utils';

interface FormMessageProps {
  label: string;
  labelFor: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
}

function FormItem({
  label,
  labelFor,
  required,
  className,
  labelClassName,
  children,
}: FormMessageProps) {
  return (
    <div
      className={cn('grid grid-cols-4 items-center gap-x-4 gap-y-1', className)}
    >
      <Label
        htmlFor={labelFor}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-balance',
          labelClassName,
        )}
      >
        {label}{' '}
        <span className={cn('text-red-400', { invisible: !required })}>*</span>
      </Label>
      {children}
    </div>
  );
}

export default FormItem;
