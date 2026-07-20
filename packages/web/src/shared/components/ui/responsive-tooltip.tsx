import { useState, type ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

interface ResponsiveTipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  contentClassName?: string;
  delay?: number;
}

export const ResponsiveTooltip = ({
  content,
  children,
  className,
  contentClassName,
  side = 'top',
  align = 'center',
  delay = 200,
}: ResponsiveTipProps) => {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delay={delay}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger render={<span className={className} />}>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className={contentClassName}>
          <span className="inline-block">{content}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
