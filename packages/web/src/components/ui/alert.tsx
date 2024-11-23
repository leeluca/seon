import type { VariantProps } from 'class-variance-authority';

import { cva } from 'class-variance-authority';
import React from 'react';

import { cn } from '~/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        warning:
          'border-warning/50 text-warning dark:border-warning [&>svg]:text-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<
  HTMLDivElement,
  AlertProps & VariantProps<typeof alertVariants>
>(({ className, variant, icon, children, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      alertVariants({ variant }),
      icon && 'flex items-center space-x-3',
      className,
    )}
    {...props}
  >
    {icon && <div className="flex-shrink-0">{icon}</div>}
    <div>{children}</div>
  </div>
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h5>
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
