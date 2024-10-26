import { useState } from 'react';
import { useStatus } from '@powersync/react';
import { format, isToday } from 'date-fns';
import {
  CircleUserIcon,
  CloudIcon,
  CloudOffIcon,
  RefreshCcwIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import usePostSignOut from '~/apis/hooks/usePostSignOut';
import { useAuthContext, useUser } from '~/states/userContext';
import SignInForm from './SignInForm';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface ConnectionErrorComponentProps {
  isSignedIn: boolean;
  connected: boolean;
  onSignInCallback: () => void;
}
const ConnectionErrorComponent = ({
  isSignedIn,
  connected,
  onSignInCallback,
}: ConnectionErrorComponentProps) => {
  if (!window.navigator.onLine) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Sync is off</h4>
        <p className="text-muted-foreground text-sm">
          Check your internet connection and try again.
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <>
        <div className="space-y-2 pb-4">
          <h4 className="font-medium leading-none">Sync is off</h4>
          <p className="text-muted-foreground text-sm">
            Sign in to sync your data.
          </p>
        </div>

        <SignInForm onSignInCallback={onSignInCallback} />
      </>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Sync is off</h4>
        <p className="text-muted-foreground text-sm">
          Could not connect with the sync service. Try again later.
        </p>
      </div>
    );
  }
};

function StatusMenu() {
  const {
    connected,
    dataFlowStatus: { downloading, uploading },
    lastSyncedAt,
  } = useStatus();

  const user = useUser();
  const { isSignedIn, isLoading } = useAuthContext();

  const isSyncing = downloading || uploading;

  const [open, setOpen] = useState(false);

  const togglePopover = () => setOpen((prev) => !prev);
  const { trigger: signOut, isMutating } = usePostSignOut();

  if (isLoading) {
    return (
      <div className="ml-auto flex items-center gap-2 rounded-xl bg-gray-200/50 px-4 py-1">
        <div className="h-7" />
      </div>
    );
  }

  return (
    <>
      <div className="ml-auto flex items-center gap-2 rounded-xl bg-gray-200/50 px-4 py-1">
        {isSyncing && (
          <Button size="icon-sm" variant="ghost">
            <RefreshCcwIcon
              size={18}
              className="rotate-180 transform animate-spin"
            />
          </Button>
        )}
        {connected ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-sm" variant="ghost">
                <CloudIcon size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[121px]" sideOffset={5}>
              <div className="space-y-2">
                <h3 className="text-pretty font-medium leading-none">
                  Your data is synced!
                </h3>
                {lastSyncedAt && (
                  <div className="text-muted-foreground">
                    <p className="text-sm">Last synced: </p>
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
              <Button size="icon-sm" variant="ghost">
                <CloudOffIcon size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className={!isSignedIn ? 'mr-8' : undefined}
              sideOffset={5}
            >
              <ConnectionErrorComponent
                isSignedIn={isSignedIn}
                connected={connected}
                onSignInCallback={() => {
                  setOpen(false);

                  toast.success(`Welcome back, ${user?.name}!`);
                }}
              />
            </PopoverContent>
          </Popover>
        )}
        {isSignedIn && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-sm" variant="ghost">
                <CircleUserIcon size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="mr-8 w-[121px]" sideOffset={5}>
              <div className="space-y-2 pb-4">
                <h3 className="text-balance font-medium leading-none">
                  Hello, {user?.name}!
                </h3>
              </div>

              <Button
                variant="outline"
                disabled={isMutating}
                // TODO: alert if there is unsynced data
                // TODO: add loading state
                onClick={() => {
                  void signOut();
                }}
              >
                Sign out
              </Button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </>
  );
}

export default StatusMenu;
