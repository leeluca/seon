import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '~/utils/';

const buttonVariants = cva(
  'inline-flex gap-2 select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors has-hover:focus-visible:outline-hidden has-hover:focus-visible:ring-1 has-hover:focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        responsive: 'h-10 rounded-md px-8 sm:h-9 sm:px-4 sm:py-2',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
        'icon-responsive': 'h-8 w-8 sm:h-7 sm:w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        data-vaul-no-drag
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
