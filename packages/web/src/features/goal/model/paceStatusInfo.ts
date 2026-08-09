import { plural, t } from '@lingui/core/macro';

import type { PaceStatus } from '~/data/domain/goalMetrics';

export function paceStatusInfo(status: PaceStatus): {
  label: string;
  className: string;
} {
  switch (status.kind) {
    case 'completed':
      return { label: t`done`, className: 'text-primary' };
    case 'notStarted':
      return { label: t`not started`, className: 'text-muted-foreground' };
    case 'ahead':
      return {
        label: plural(status.days, {
          one: '# day ahead',
          other: '# days ahead',
        }),
        className: 'text-primary',
      };
    case 'behind':
      return {
        label: plural(status.days, {
          one: '# day behind',
          other: '# days behind',
        }),
        className: 'text-warning',
      };
    default:
      return { label: t`on pace`, className: 'text-primary' };
  }
}
