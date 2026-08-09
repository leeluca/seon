import type { ReactNode } from 'react';
import { Plural, Trans } from '@lingui/react/macro';

import type { PaceStatus } from '~/data/domain/goalMetrics';
import { cn } from '~/utils';

export function Chip({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums',
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Pace state chip. Behind is amber, never red — being behind is a state,
 * not a failure.
 */
export function PaceChip({ status }: { status: PaceStatus }) {
  switch (status.kind) {
    case 'completed':
      return (
        <Chip className="bg-primary/10 text-primary">
          <Trans>Done</Trans>
        </Chip>
      );
    case 'notStarted':
      return (
        <Chip className="bg-muted text-muted-foreground">
          <Trans>Not started</Trans>
        </Chip>
      );
    case 'ahead':
      return (
        <Chip className="bg-primary/10 text-primary">
          <Plural value={status.days} one="# day ahead" other="# days ahead" />
        </Chip>
      );
    case 'behind':
      return (
        <Chip className="bg-warning/15 text-warning">
          <Plural
            value={status.days}
            one="# day behind"
            other="# days behind"
          />
        </Chip>
      );
    default:
      return (
        <Chip className="bg-primary/10 text-primary">
          <Trans>On pace</Trans>
        </Chip>
      );
  }
}
