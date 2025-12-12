import { Trans } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { HomeIcon } from 'lucide-react';

import { cn } from '~/utils';
import { Button } from '../ui/button';

interface NotFoundProps {
  className?: string;
}

function NotFound({ className }: NotFoundProps) {
  return (
    <div
      className={cn(
        'bg-background flex min-h-[50vh] flex-col items-center justify-center p-4 text-center',
        className,
      )}
    >
      <h1 className="mb-4 text-2xl font-bold">
        <Trans>Page Not Found</Trans>
      </h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        <Trans>
          The page you're looking for doesn't exist or has been moved.
        </Trans>
      </p>

      <div className="flex w-64 flex-col gap-4 *:w-full">
        <Button asChild>
          <Link to="/" replace>
            <HomeIcon className="mr-2 h-4 w-4" />
            <Trans>Return to Home</Trans>
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default NotFound;
