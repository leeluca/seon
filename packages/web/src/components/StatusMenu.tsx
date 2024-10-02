import { useState } from 'react';
import { useStatus } from '@powersync/react';
import {
  CircleUserIcon,
  CloudIcon,
  CloudOffIcon,
  RefreshCcwIcon,
} from 'lucide-react';
import { mutate } from 'swr';

import { postSignOut } from '~/apis/auth';
import useAuthStatus, { AUTH_STATUS_KEY } from '~/apis/hooks/useAuthStatus';
import { useUser } from '~/states/userContext';
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
  } = useStatus();
  const {
    data: { isSignedIn },
    isLoading,
  } = useAuthStatus();
  const user = useUser();

  const isSyncing = downloading || uploading;

  const [open, setOpen] = useState(false);

  const togglePopover = () => setOpen((prev) => !prev);

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <>
      <div className="ml-auto flex items-center gap-2 rounded-xl bg-gray-200/50 px-4 py-1">
        {isSyncing && (
          <Button size="icon-small" variant="ghost">
            <RefreshCcwIcon
              size={18}
              className="rotate-180 transform animate-spin"
            />
          </Button>
        )}
        {connected ? (
          <Button>
            <CloudIcon size={18} />
          </Button>
        ) : (
          <Popover open={open} onOpenChange={togglePopover}>
            <PopoverTrigger asChild>
              <Button size="icon-small" variant="ghost">
                <CloudOffIcon size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={5}>
              <ConnectionErrorComponent
                isSignedIn={isSignedIn}
                connected={connected}
                onSignInCallback={() => setOpen(false)}
              />
            </PopoverContent>
          </Popover>
        )}
        {isSignedIn && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-small" variant="ghost">
                <CircleUserIcon size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[121px]" sideOffset={5}>
              <div className="space-y-2 pb-4">
                <h3 className="text-balance font-medium leading-none">
                  Hello, {user?.name}!
                </h3>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  void postSignOut().then(() => mutate(AUTH_STATUS_KEY));
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
