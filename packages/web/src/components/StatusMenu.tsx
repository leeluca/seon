import { lazy, Suspense, useEffect, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useStatus } from '@powersync/react';
import { format, isToday } from 'date-fns';
import {
  CableIcon,
  CircleUserIcon,
  CloudIcon,
  CloudOffIcon,
  PlaneIcon,
  RefreshCcwIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { useFetchAuthStatus } from '~/apis/hooks/useFetchAuthStatus';
import type { PostSignInResponse } from '~/apis/hooks/usePostSignIn';
import { useDebounceValue } from '~/hooks/useDebounceValue';
import { useIsOnline } from '~/states/isOnlineContext';
import { useUserStore } from '~/states/stores/userStore';
import { isDemo } from '~/utils/demo';
import { APIError } from '~/utils/errors';
import SignInForm from './SignInForm';
import SignOutButton from './SignOutButton';
import { Button, buttonVariants } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import UpdatePrompt from './UpdatePrompt';

interface NotSignedInContentProps {
  isSyncEnabledUser: boolean;
  onSignInCallback: (userData: PostSignInResponse['user']) => void;
}
const NotSignedInContent = ({
  isSyncEnabledUser,
  onSignInCallback,
}: NotSignedInContentProps) => {
  return (
    <>
      <div className="space-y-2 pb-4">
        <h4 className="font-medium leading-none">
          <Trans>Sync is off</Trans>
        </h4>
        {isSyncEnabledUser ? (
          <div className="text-muted-foreground text-sm">
            <p>
              <Trans>Your session has expired.</Trans>
            </p>
            <p>
              <Trans>Sign in again to sync your data.</Trans>
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            <Trans>Sign in to sync your data.</Trans>
          </p>
        )}
      </div>

      <SignInForm onSignInCallback={onSignInCallback} />
    </>
  );
};

const SyncErrorContent = () => {
  return (
    <div className="space-y-2">
      <h4 className="font-medium leading-none">
        <Trans>Sync is off</Trans>
      </h4>
      <p className="text-muted-foreground text-pretty text-sm">
        <Trans>Could not connect with the sync service. Try again later.</Trans>
      </p>
    </div>
  );
};

type SyncStatusDisplay =
  | 'offline'
  | 'connecting'
  | 'synced'
  | 'notSignedIn'
  | 'error';

function StatusMenu() {
  const { t } = useLingui();
  const {
    connected: isSyncConnected,
    dataFlowStatus: { downloading, uploading },
    lastSyncedAt,
    hasSynced,
    connecting,
  } = useStatus();

  const [userName, useSync] = useUserStore(
    useShallow((state) => [state.user.name, state.user.useSync]),
  );
  const [isFirstConnecting, setIsFirstConnecting] = useState(true);

  const { data, isLoading, isError, error } = useFetchAuthStatus();

  const isSignedIn = !!data?.result;
  const isOnline = useIsOnline();

  const isSyncing = downloading || uploading;
  const debouncedIsSyncing = useDebounceValue(isSyncing, 200);
  const debouncedConnecting = useDebounceValue(connecting, 400);

  const [open, setOpen] = useState(false);

  const togglePopover = () => setOpen((prev) => !prev);

  const display: SyncStatusDisplay = (() => {
    if (!isOnline) return 'offline';
    if (isError && (!(error instanceof APIError) || error.status !== 401))
      return 'error';
    if (!isSignedIn) return 'notSignedIn';
    if (isFirstConnecting || debouncedConnecting) return 'connecting';
    if (isSyncConnected && (isSyncing || hasSynced)) return 'synced';
    return 'error';
  })();

  // NOTE: fix for delay in the connecting state to become true when the component is mounted
  useEffect(() => {
    setTimeout(() => {
      setIsFirstConnecting(false);
    }, 200);
  }, []);

  if (isLoading) {
    return (
      <output
        className="ml-auto flex h-9 w-[96px] items-center justify-center gap-2 rounded-xl bg-gray-200/50 px-2 py-1"
        aria-label={t`Loading user status`}
      >
        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" />
      </output>
    );
  }

  if (isDemo) {
    const LazyDemoIndicator = lazy(() => import('./DemoIndicator'));
    return (
      <div className="mb-1 ml-auto flex min-h-[40px] items-center gap-2">
        <UpdatePrompt />
        <Suspense fallback={null}>
          <LazyDemoIndicator />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2 rounded-xl bg-gray-200/50 px-4 py-1">
      {debouncedIsSyncing && (
        <output
          aria-live="polite"
          aria-atomic="true"
          className={buttonVariants({
            variant: 'ghost',
            size: 'icon-responsive',
          })}
        >
          <span className="sr-only">{t`Syncing`}</span>
          <RefreshCcwIcon
            size={18}
            className="rotate-180 transform animate-spin"
          />
        </output>
      )}
      <UpdatePrompt />
      <Popover open={open} onOpenChange={togglePopover}>
        <PopoverTrigger asChild>
          <Button
            size="icon-responsive"
            variant="ghost"
            aria-label={t`Check sync status`}
          >
            {display === 'offline' ? (
              <PlaneIcon size={18} />
            ) : display === 'connecting' ? (
              <CableIcon size={18} />
            ) : display === 'synced' ? (
              <CloudIcon size={18} />
            ) : (
              <CloudOffIcon size={18} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={
            display === 'synced'
              ? 'mr-3 mt-0.5 min-w-[121px] max-w-fit sm:mr-8'
              : 'mr-3 mt-0.5 sm:mr-8'
          }
          sideOffset={5}
        >
          {display === 'synced' && (
            <div className="space-y-2">
              <h3 className="text-pretty font-medium leading-none">
                <Trans>Your data is synced!</Trans>
              </h3>
              {lastSyncedAt && (
                <div className="text-muted-foreground">
                  <p className="text-sm">
                    <Trans>Last synced:</Trans>{' '}
                  </p>
                  <p className="text-xs">{format(lastSyncedAt, 'p')} </p>
                  {!isToday(lastSyncedAt) && (
                    <p className="text-xs">{format(lastSyncedAt, 'P')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {display === 'offline' && (
            <div className="space-y-2">
              <h4 className="font-medium leading-none">
                <Trans>You're offline</Trans>
              </h4>
              <p className="text-muted-foreground text-sm">
                <Trans>Check your internet connection and try again.</Trans>
              </p>
            </div>
          )}

          {display === 'connecting' && (
            <div className="space-y-2">
              <h4 className="font-medium leading-none">
                <Trans>Connecting to sync…</Trans>
              </h4>
              <p className="text-muted-foreground text-pretty break-keep">
                <Trans>
                  Establishing a connection. This may take a moment.
                </Trans>
              </p>
            </div>
          )}

          {display === 'notSignedIn' && (
            <NotSignedInContent
              isSyncEnabledUser={Boolean(useSync)}
              onSignInCallback={({ name: userName }) => {
                setOpen(false);
                userName && toast.success(t`Welcome back, ${userName}!`);
              }}
            />
          )}

          {display === 'error' && <SyncErrorContent />}
        </PopoverContent>
      </Popover>
      {(isSignedIn || Boolean(useSync)) && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon-responsive"
              variant="ghost"
              aria-label="User info"
            >
              <CircleUserIcon size={18} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="mr-3 w-min max-w-96 sm:mr-8"
            sideOffset={5}
          >
            <div className="space-y-2 pb-4">
              <h3 className="text-pretty text-center font-medium leading-none">
                <Trans>Hello, {userName}!</Trans>
              </h3>
            </div>
            <SignOutButton />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default StatusMenu;
