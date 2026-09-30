import { useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { SettingsIcon } from 'lucide-react';

import { type SyncStatusDisplay, useSyncStatus } from '~/hooks/useSyncStatus';
import { cn } from '~/utils';
import { buttonVariants } from '../ui/button';

/** Dot colour per sync state; states that need no attention show none. */
const DOT_CLASS: Partial<Record<SyncStatusDisplay, string>> = {
  synced: 'bg-primary',
  connecting: 'bg-muted-foreground animate-pulse',
  offline: 'bg-warning',
  unreachable: 'bg-warning',
  error: 'bg-warning',
};

/**
 * The header's single door to account, sync, language and backup. The dot
 * mirrors the sync state so it stays visible without opening the page.
 */
export function SettingsButton({
  showSyncState = true,
}: {
  showSyncState?: boolean;
}) {
  const { t } = useLingui();
  const { display, isSessionExpired } = useSyncStatus();
  const dotClass = showSyncState
    ? isSessionExpired && display === 'notSignedIn'
      ? 'bg-warning'
      : DOT_CLASS[display]
    : undefined;

  return (
    <Link
      to="/settings"
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'relative',
      )}
      activeProps={{ className: 'bg-muted text-foreground' }}
      aria-label={t`Settings`}
    >
      <SettingsIcon size={20} aria-hidden="true" />
      {dotClass && (
        <span
          className={cn(
            'ring-background absolute top-1.5 right-1.5 size-2 rounded-full ring-2',
            dotClass,
          )}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
