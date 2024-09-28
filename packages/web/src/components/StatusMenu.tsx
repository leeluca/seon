import { useState } from 'react';
import { useStatus } from '@powersync/react';
import {
  CircleUserIcon,
  CloudIcon,
  CloudOffIcon,
  RefreshCcwIcon,
} from 'lucide-react';

import useAuthStatus from '~/apis/hooks/useAuthStatus';
import SignInForm from './SignInForm';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

function StatusMenu() {
  const {
    connected,
    dataFlowStatus: { downloading, uploading },
  } = useStatus();
  const {
    data: { isSignedIn },
    isLoading,
  } = useAuthStatus();

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
            <PopoverContent>
              <SignInForm onSignInCallback={() => setOpen(false)} />
            </PopoverContent>
          </Popover>
        )}
        {isSignedIn && (
          <Button size="icon-small" variant="ghost">
            <CircleUserIcon size={18} />
          </Button>
        )}
      </div>
    </>
  );
}

export default StatusMenu;
