import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { BeakerIcon } from 'lucide-react';

import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export function DemoIndicator() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="ml-auto flex items-center gap-2 rounded-xl bg-amber-100 p-1">
          <Button variant="ghost" aria-label={t`Demo Mode`} className="h-8 hover:bg-amber-200/50">
            <BeakerIcon size={18} className="text-amber-600" />
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
          <p className="text-muted-foreground text-sm break-keep">
            <Trans>
              Syncing features are disabled.<br/>All data is stored
              locally.
            </Trans>
          </p>
          <p className="text-muted-foreground text-sm break-keep">
            <Trans>
              Sample data has been created for you to explore the app's
              functionality.
            </Trans>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
