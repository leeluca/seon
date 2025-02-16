import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { BadgePlusIcon, Loader2Icon } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

function ReloadPrompt() {
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateServiceWorker(true);
    } catch (error) {
      console.error('Failed to update:', error);
      setIsUpdating(false);
    }
  };

  return (
    <>
      {needRefresh && (
        <Popover>
          <Tooltip defaultOpen>
            <TooltipTrigger asChild className="disabled:pointer-events-auto">
              <PopoverTrigger asChild>
                <Button
                  size="icon-responsive"
                  variant="ghost"
                  aria-label="User info"
                >
                  <BadgePlusIcon size={18} />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent
              onPointerDownOutside={(e) => {
                e.preventDefault();
              }}
              sideOffset={-2}
            >
              <TooltipArrow height={8} width={10} />
              <p>
                <Trans>Update available</Trans>
              </p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className="mr-3 flex w-min min-w-44 max-w-96 flex-col items-center justify-center gap-2 sm:mr-8"
            sideOffset={5}
          >
            <h3 className="text-nowrap text-center font-medium leading-none">
              <Trans>Ready to update</Trans>
            </h3>
            <p className="mb-1 shrink-0 text-balance break-keep text-center text-sm font-light leading-none">
              <Trans>Refresh to get the latest improvements.</Trans>
            </p>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? <Loader2Icon className="animate-spin" /> : null}
              <Trans>Update now</Trans>
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

export default ReloadPrompt;
