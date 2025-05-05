import type { ComponentProps, ReactNode } from 'react';

import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from './popover';

interface ResponsivePopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Optional props to pass to the Popover/Drawer content */
  contentProps?: ComponentProps<typeof PopoverContent> &
    ComponentProps<typeof DrawerContent>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Virtual ref for anchor positioning */
  virtualRef?:
    | React.RefObject<Element>
    | { current: { getBoundingClientRect: () => DOMRect } }
    | null;
  drawerTitle: ReactNode;
  overlayClassName?: string;
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
  drawerTitle,
  overlayClassName,
}: ResponsivePopoverProps) {
  const isMobile = useViewportStore((state) => state.isMobile);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild className={className}>
          {trigger}
        </DrawerTrigger>
        <DrawerContent
          className={cn('px-8 pb-4', contentClassName)}
          overlayClassName={overlayClassName}
          aria-describedby={undefined}
          {...contentProps}
        >
          <DrawerHeader className="mb-2">
            <DrawerTitle>{drawerTitle}</DrawerTitle>
          </DrawerHeader>
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {virtualRef && <PopoverAnchor virtualRef={virtualRef} />}
      <PopoverTrigger asChild className={className}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className={contentClassName} {...contentProps}>
        {children}
      </PopoverContent>
    </Popover>
  );
}
