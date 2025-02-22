import type { ComponentProps, ReactNode } from 'react';
import { Dialog, DialogContent, DialogTrigger } from './dialog';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';
import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';

interface ResponsivePopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Optional props to pass to the Popover/Dialog content */
  contentProps?: ComponentProps<typeof PopoverContent> & ComponentProps<typeof DialogContent>;
  /** Control the open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Virtual ref for anchor positioning */
  virtualRef?: React.RefObject<Element> | { current: { getBoundingClientRect: () => DOMRect } } | null;
}

export function ResponsivePopover({
  trigger,
  children,
  className,
  contentClassName,
  contentProps,
  open,
  onOpenChange,
  virtualRef,
}: ResponsivePopoverProps) {
  const isMobile = useViewportStore((state) => state.isMobile);

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild className={className}>
          {trigger}
        </DialogTrigger>
        <DialogContent
          className={cn(
            'sm:max-w-[425px]',
            contentClassName
          )}
          {...contentProps}
        >
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {virtualRef && <PopoverAnchor virtualRef={virtualRef} />}
      <PopoverTrigger asChild className={className}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-auto min-w-[200px]',
          contentClassName
        )}
        {...contentProps}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
} 