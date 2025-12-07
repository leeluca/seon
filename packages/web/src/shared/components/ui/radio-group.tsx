import * as React from 'react';
import { DotFilledIcon } from '@radix-ui/react-icons';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

import { cn } from '~/utils';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn('grid gap-2', className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'border-primary text-primary focus-visible:ring-ring aspect-square h-[18px] w-[18px] rounded-full border shadow-sm focus:outline-hidden focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 sm:h-4 sm:w-4',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="relative block">
        <DotFilledIcon className="fill-primary absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 sm:h-3.5 sm:w-3.5" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
