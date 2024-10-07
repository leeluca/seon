import { Label } from '@radix-ui/react-label';

import { cn } from '~/utils';

interface FormMessageProps {
  label: string;
  labelFor: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}
function FormItem({
  label,
  labelFor,
  required,
  children,
  className,
}: FormMessageProps) {
  return (
    <div
      className={cn('grid grid-cols-4 items-center gap-x-4 gap-y-1', className)}
    >
      <Label htmlFor={labelFor} className="text-right">
        {label}{' '}
        <span className={cn('text-red-400', { invisible: !required })}>*</span>
      </Label>
      {children}
    </div>
  );
}

export default FormItem;
