import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '~/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> & {
    onTooltipOpenChange?: (open: boolean) => void;
  }
>(({ className, onTooltipOpenChange, ...props }, ref) => {
  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (onTooltipOpenChange) {
      onTooltipOpenChange(true);
    }
    props.onTouchStart?.(e);
  };

  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      className={className}
      {...props}
      onTouchStart={handleTouchStart}
    />
  );
});
TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = 'TooltipContent';

interface ResponsiveTipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  contentClassName?: string;
  delayDuration?: number;
}

export const ResponsiveTooltip = ({
  content,
  children,
  className,
  contentClassName,
  side = 'top',
  align = 'center',
  delayDuration = 200,
}: ResponsiveTipProps) => {
  const [open, setOpen] = React.useState(false);
  const toggleOpen = React.useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild onTooltipOpenChange={toggleOpen}>
          <span className={className}>{children}</span>
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className={contentClassName}>
          <span className="inline-block">{content}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
