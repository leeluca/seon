import { useState, type ReactNode } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { format, isToday } from 'date-fns';
import {
  CableIcon,
  CheckIcon,
  CloudIcon,
  CloudOffIcon,
  LoaderCircleIcon,
  WifiOffIcon,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { LOCALES } from '~/constants/locales';
import { type SyncStatusDisplay, useSyncStatus } from '~/hooks/useSyncStatus';
import { updateProfileLanguage } from '~/shared/components/common/languagePreference';
import SignOutButton from '~/shared/components/common/SignOutButton';
import { WorkspaceDataControls } from '~/shared/components/common/WorkspaceDataControls';
import { buttonVariants } from '~/shared/components/ui/button';
import { Card } from '~/shared/components/ui/card';
import { useUserStore } from '~/states/stores/userStore';
import { cn } from '~/utils';
import { isDemo } from '~/utils/demo';

function Section({
  id,
  title,
  flush = false,
  children,
}: {
  id: string;
  title: ReactNode;
  /** For lists whose rows carry their own padding. */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2
        id={id}
        className="text-muted-foreground px-1 text-xs font-semibold tracking-widest uppercase"
      >
        {title}
      </h2>
      <Card
        size="sm"
        className={cn('rounded-2xl px-4 shadow-xs', flush && 'py-0')}
      >
        {children}
      </Card>
    </section>
  );
}

function AccountSection() {
  const { isSignedIn, isSessionExpired, userName, email } = useSyncStatus();

  if (isSignedIn) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{userName}</p>
          {email && (
            <p className="text-muted-foreground truncate text-xs">{email}</p>
          )}
        </div>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm text-pretty">
        {isSessionExpired ? (
          <Trans>
            You were signed out on this device. Sign in again to keep syncing.
          </Trans>
        ) : (
          <Trans>
            Your goals are saved on this device. Sign in to back them up and use
            them on other devices.
          </Trans>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link to="/signin" className={buttonVariants()}>
          <Trans>Sign in</Trans>
        </Link>
        {!isSessionExpired && (
          <Link to="/signup" className={buttonVariants({ variant: 'outline' })}>
            <Trans>Create account</Trans>
          </Link>
        )}
      </div>
    </div>
  );
}

const SYNC_ICONS: Record<SyncStatusDisplay, typeof CloudIcon> = {
  synced: CloudIcon,
  connecting: CableIcon,
  checking: LoaderCircleIcon,
  offline: WifiOffIcon,
  unreachable: CloudOffIcon,
  error: CloudOffIcon,
  notSignedIn: CloudOffIcon,
};

function SyncSection() {
  const { display, isSyncing, lastSyncedAt } = useSyncStatus();
  const Icon = SYNC_ICONS[display];
  const needsAttention =
    display === 'offline' || display === 'unreachable' || display === 'error';

  const lastSynced =
    lastSyncedAt &&
    (isToday(lastSyncedAt)
      ? format(lastSyncedAt, 'p')
      : format(lastSyncedAt, 'PP p'));

  return (
    <div className="flex items-start gap-3" aria-live="polite">
      <Icon
        size={20}
        aria-hidden="true"
        className={cn(
          'mt-0.5 shrink-0',
          display === 'synced' ? 'text-primary' : 'text-muted-foreground',
          needsAttention && 'text-warning',
          (display === 'checking' || isSyncing) && 'animate-spin',
        )}
      />
      <div className="min-w-0">
        <p className="font-medium">
          {display === 'synced' && <Trans>Up to date</Trans>}
          {display === 'connecting' && <Trans>Connecting…</Trans>}
          {display === 'checking' && <Trans>Checking your account…</Trans>}
          {display === 'offline' && <Trans>You're offline</Trans>}
          {display === 'unreachable' && (
            <Trans>Can't reach the sync server</Trans>
          )}
          {display === 'error' && <Trans>Sync isn't working right now</Trans>}
          {display === 'notSignedIn' && <Trans>Sync is off</Trans>}
        </p>
        <p className="text-muted-foreground text-xs text-pretty">
          {display === 'synced' &&
            (lastSynced ? (
              <Trans>Last synced {lastSynced}</Trans>
            ) : (
              <Trans>Your changes are backed up to your account.</Trans>
            ))}
          {display === 'connecting' && <Trans>This can take a moment.</Trans>}
          {(display === 'offline' ||
            display === 'unreachable' ||
            display === 'error') && (
            <Trans>
              Changes stay saved on this device and sync when the connection is
              back.
            </Trans>
          )}
          {display === 'notSignedIn' && (
            <Trans>Changes are saved on this device only.</Trans>
          )}
        </p>
      </div>
    </div>
  );
}

function LanguageSection() {
  const { i18n, t } = useLingui();
  const [user, refetchUser] = useUserStore(
    useShallow((state) => [state.user, state.fetch]),
  );
  const [pending, setPending] = useState<string | null>(null);

  const choose = async (locale: keyof typeof LOCALES) => {
    setPending(locale);
    try {
      await updateProfileLanguage({
        profileId: user.id,
        updatedLanguage: locale,
      });
      await refetchUser();
    } finally {
      setPending(null);
    }
  };

  return (
    <fieldset className="-mx-4 flex flex-col" disabled={pending !== null}>
      <legend className="sr-only">{t`Language`}</legend>
      {Object.entries(LOCALES).map(([locale, label]) => {
        const isCurrent = i18n.locale === locale;
        return (
          <label
            key={locale}
            lang={locale}
            className="hover:bg-muted has-focus-visible:bg-muted border-border flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t px-4 text-sm first-of-type:border-t-0"
          >
            <input
              type="radio"
              name="language"
              value={locale}
              checked={isCurrent}
              onChange={() => void choose(locale as keyof typeof LOCALES)}
              className="sr-only"
            />
            {label}
            {isCurrent && (
              <CheckIcon
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

export function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        <Trans>Settings</Trans>
      </h1>

      {isDemo ? (
        <Section id="settings-demo" title={<Trans>Demo</Trans>}>
          <p className="text-muted-foreground text-sm text-pretty">
            <Trans>
              Sync is turned off in the demo. Everything stays on this device.
            </Trans>
          </p>
        </Section>
      ) : (
        <>
          <Section id="settings-account" title={<Trans>Account</Trans>}>
            <AccountSection />
          </Section>
          <Section id="settings-sync" title={<Trans>Sync</Trans>}>
            <SyncSection />
          </Section>
        </>
      )}

      <Section id="settings-language" title={<Trans>Language</Trans>} flush>
        <LanguageSection />
      </Section>

      <Section id="settings-backup" title={<Trans>Backup</Trans>}>
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm text-pretty">
            <Trans>
              Save your goals and entries as a file, or restore them from one.
            </Trans>
          </p>
          <WorkspaceDataControls />
        </div>
      </Section>
    </div>
  );
}
