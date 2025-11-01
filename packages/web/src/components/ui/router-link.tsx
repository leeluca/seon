import * as React from 'react';
import { createLink } from '@tanstack/react-router';

import { cn } from '~/utils';

interface BaseRouterLinkProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick' | 'onKeyDown'> {
  href?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  interactiveChildSelector?: string | false;
}

const BaseRouterLink = React.forwardRef<HTMLDivElement, BaseRouterLinkProps>(
  (
    {
      className,
      disabled,
      href,
      interactiveChildSelector = '[data-interactive="true"]',
      tabIndex,
      role,
      onClick,
      onKeyDown,
      ...rest
    },
    ref,
  ) => {
    const shouldNavigate = React.useCallback(
      (target: EventTarget | null) => {
        if (!interactiveChildSelector) return true;
        if (!(target instanceof HTMLElement)) return true;
        return !target.closest(interactiveChildSelector);
      },
      [interactiveChildSelector],
    );

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!shouldNavigate(event.target)) {
          return;
        }
        onClick?.(event);
      },
      [disabled, shouldNavigate, onClick],
    );

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || disabled) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          if (!shouldNavigate(event.target)) {
            return;
          }

          event.preventDefault();
          event.currentTarget.click();
        }
      },
      [disabled, onKeyDown, shouldNavigate],
    );

    const resolvedRole = role ?? 'link';

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: custom link wrapper needs to remain a div for nested interactive children
      <div
        {...rest}
        ref={ref}
        role={resolvedRole}
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
        aria-disabled={disabled || undefined}
        data-href={href ?? undefined}
        data-router-link
        className={cn(
          'focus-visible:ring-ring focus-visible:ring-offset-background cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          disabled && 'pointer-events-none opacity-60',
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />
    );
  },
);
BaseRouterLink.displayName = 'BaseRouterLink';

export const RouterLink = createLink(BaseRouterLink);

export type RouterLinkProps = React.ComponentProps<typeof RouterLink>;
