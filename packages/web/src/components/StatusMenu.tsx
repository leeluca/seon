import type { PostSignInResponse } from '~/apis/hooks/usePostSignIn';

import { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useStatus } from '@powersync/react';
import { format, isToday } from 'date-fns';
import {
  CircleUserIcon,
  CloudIcon,
  CloudOffIcon,
  RefreshCcwIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { useIsOnline } from '~/states/isOnlineContext';
import { useAuthContext, useUser } from '~/states/userContext';
import SignInForm from './SignInForm';
import SignOutButton from './SignOutButton';
import { Button, buttonVariants } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface ConnectionErrorComponentProps {
  isSignedIn: boolean;
  isOnline: boolean;
  isSyncEnabledUser: boolean;
  isSyncConnected: boolean;
  onSignInCallback: (userData: PostSignInResponse['user']) => void;
}
const ConnectionErrorComponent = ({
  isSignedIn,
  isOnline,
  isSyncEnabledUser,
  isSyncConnected,
  onSignInCallback,
}: ConnectionErrorComponentProps) => {
  if (!isOnline) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium leading-none">
          <Trans>Sync is off</Trans>
        </h4>
        <p className="text-muted-foreground text-sm">
          <Trans>Check your internet connection and try again.</Trans>
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <>
        <div className="space-y-2 pb-4">
          <h4 className="font-medium leading-none">Sync is off</h4>
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
  }

  if (!isSyncConnected) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium leading-none">
          <Trans>Sync is off</Trans>
        </h4>
        <p className="text-muted-foreground text-sm">
          <Trans>
            Could not connect with the sync service. Try again later.
          </Trans>
        </p>
      </div>
    );
  }
};

function StatusMenu() {
  const { t } = useLingui();
  const {
    connected: isSyncConnected,
    dataFlowStatus: { downloading, uploading },
    lastSyncedAt,
    hasSynced,
  } = useStatus();

  const user = useUser();
  const { isSignedIn, isLoading } = useAuthContext();
  const isOnline = useIsOnline();

  const isSyncing = downloading || uploading;

  const [open, setOpen] = useState(false);

  const togglePopover = () => setOpen((prev) => !prev);

  if (isLoading) {
    return (
      <div className="ml-auto flex h-9 w-[96px] items-center justify-center gap-2 rounded-xl bg-gray-200/50 px-2 py-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="ml-auto flex items-center gap-2 rounded-xl bg-gray-200/50 px-4 py-1">
        {isSyncing && (
          <div
            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
            aria-label={t`Syncing`}
          >
            <RefreshCcwIcon
              size={18}
              className="rotate-180 transform animate-spin"
            />
          </div>
        )}
        {isOnline && isSyncConnected && hasSynced ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Check last sync time"
              >
                <CloudIcon size={18} />
              </Button>
            </PopoverTrigger>
            {/* FIXME: Increase the width so that Korean text fits */}
            <PopoverContent className="w-[121px]" sideOffset={5}>
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
            </PopoverContent>
          </Popover>
        ) : (
          <Popover open={open} onOpenChange={togglePopover}>
            <PopoverTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t`Check sync error or sign in`}
              >
                <CloudOffIcon size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className={!isSignedIn ? 'mr-8' : undefined}
              sideOffset={5}
            >
              <ConnectionErrorComponent
                isSignedIn={isSignedIn}
                isOnline={isOnline}
                isSyncConnected={isSyncConnected}
                isSyncEnabledUser={Boolean(user?.useSync)}
                onSignInCallback={({ name: userName }) => {
                  setOpen(false);
                  userName && toast.success(t`Welcome back, ${userName}!`);
                }}
              />
            </PopoverContent>
          </Popover>
        )}
        {(isSignedIn || Boolean(user?.useSync)) && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="User info">
                <CircleUserIcon size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="mr-8 w-[121px]" sideOffset={5}>
              <div className="space-y-2 pb-4">
                <h3 className="text-pretty font-medium leading-none">
                  <Trans>Hello, {user?.name}!</Trans>
                </h3>
              </div>
              <SignOutButton />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </>
  );
}

export default StatusMenu;
