import type { ComponentProps, ReactElement, ReactNode } from 'react';

import { useViewportStore } from '~/states/stores/viewportStore';
import { cn } from '~/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type ResponsivePopoverContentProps = ComponentProps<typeof PopoverContent> &
  ComponentProps<typeof DrawerContent> & {
    onInteractOutside?: (event: Event) => void;
  };

interface ResponsivePopoverProps {
  trigger: ReactElement | null;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Optional props to pass to the Popover/Drawer content */
  contentProps?: ResponsivePopoverContentProps;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Virtual ref for anchor positioning */
  virtualRef?: ComponentProps<typeof PopoverContent>['anchor'];
  drawerTitle: ReactNode;
  overlayClassName?: string;
  handleOnly?: boolean;
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
  handleOnly,
}: ResponsivePopoverProps) {
  const isMobile = useViewportStore((state) => state.isMobile);
  const {
    align,
    alignOffset,
    anchor,
    collisionPadding,
    onInteractOutside,
    side,
    sideOffset,
    ...sharedContentProps
  } = contentProps ?? {};

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} handleOnly={handleOnly}>
        {trigger && <DrawerTrigger className={className} render={trigger} />}
        <DrawerContent
          className={cn('px-8 pb-6', contentClassName)}
          overlayClassName={overlayClassName}
          aria-describedby={undefined}
          {...sharedContentProps}
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
    <Popover
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && eventDetails.reason === 'outside-press') {
          onInteractOutside?.(eventDetails.event);

          if (eventDetails.event.defaultPrevented) {
            eventDetails.cancel();
            return;
          }
        }

        onOpenChange?.(nextOpen);
      }}
    >
      {trigger && <PopoverTrigger className={className} render={trigger} />}
      <PopoverContent
        align={align}
        alignOffset={alignOffset}
        anchor={virtualRef ?? anchor}
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
        className={contentClassName}
        {...sharedContentProps}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
