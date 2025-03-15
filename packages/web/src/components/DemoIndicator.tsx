import { useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { FlaskConicalIcon, RotateCcwIcon } from 'lucide-react';

import { purgeStorage } from '~/utils/storage';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

function ResetDemo() {
  const [isResetting, setIsResetting] = useState(false);

  const resetDemo = async () => {
    setIsResetting(true);
    await purgeStorage();
    location.reload();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <RotateCcwIcon size={18} /> <Trans>Start Over</Trans>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>
          <Trans>Reset Demo</Trans>
        </DialogTitle>
        <DialogDescription className="mb-1">
          <Trans>This will delete all your data and reset the demo.</Trans>
        </DialogDescription>
        <Button
          variant="destructive"
          onClick={() => void resetDemo()}
          disabled={isResetting}
        >
          <Trans>Reset</Trans>
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function DemoIndicator() {
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <div className="ml-auto flex items-center gap-2 rounded-xl bg-amber-100">
            <Button
              variant="ghost"
              aria-label={t`Demo Mode`}
              className="hover:bg-amber-200/50"
            >
              <FlaskConicalIcon size={18} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                <Trans>Demo Mode</Trans>
              </span>
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="mr-3 min-w-[200px] max-w-fit sm:mr-8"
          sideOffset={5}
        >
          <div className="space-y-2">
            <h3 className="text-pretty font-medium leading-none">
              <Trans>Demo Mode</Trans>
            </h3>
            <p className="text-muted-foreground break-keep text-sm">
              <Trans>
                Syncing features are disabled.
                <br />
                All data is stored locally.
              </Trans>
            </p>
            <p className="text-muted-foreground break-keep text-sm">
              <Trans>
                Sample data has been created for you to explore the app's
                functionality.
              </Trans>
            </p>
          </div>
        </PopoverContent>
      </Popover>
      <ResetDemo />
    </>
  );
}
