import { useState } from 'react';
import { t } from '@lingui/core/macro';
import { BadgePlusIcon, Loader2Icon, RefreshCcwIcon } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { cn } from '~/utils';
import { Button } from './ui/button';

function UpdateButton({ text }: { text?: React.ReactNode }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    needRefresh: [needRefresh],
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

  if (!needRefresh) {
    return null;
  }

  return (
    <Button variant="outline" onClick={handleUpdate} disabled={isUpdating}>
      {isUpdating ? (
        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <BadgePlusIcon className="mr-2 h-4 w-4" />
      )}
      {text || 'Update application'}
    </Button>
  );
}

interface ErrorLayoutProps {
  title: React.ReactNode;
  errorMessage: React.ReactNode;
  refreshText: React.ReactNode;
  updateText?: React.ReactNode;
  className: string;
}

function ErrorLayout({
  className,
  title,
  errorMessage,
  refreshText,
  updateText,
}: ErrorLayoutProps) {
  return (
    <div
      className={cn(
        'bg-background flex flex-col items-center justify-center p-4 text-center',
        className,
      )}
    >
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      {errorMessage && (
        <p className="text-muted-foreground mb-6 max-w-md">{errorMessage}</p>
      )}

      <div className="flex w-64 flex-col gap-4 *:w-full">
        <Button onClick={() => window.location.reload()}>
          <RefreshCcwIcon className="mr-2 h-4 w-4" />
          {refreshText}
        </Button>

        <UpdateButton text={updateText} />
      </div>
    </div>
  );
}

interface ErrorFallbackProps {
  isRoot?: boolean;
  error?: Error;
}

function ErrorFallback({ isRoot = false, error }: ErrorFallbackProps) {
  const defaultErrorMsg = 'An unexpected error occurred.';
  const errorMessage = error?.message || defaultErrorMsg;

  // NOTE: Locale provider is not available in the root
  if (isRoot) {
    return (
      <ErrorLayout
        title="Something went wrong"
        refreshText="Refresh page"
        errorMessage={errorMessage}
        className="min-h-dvh"
      />
    );
  }

  // Lower level fallback (with providers available)
  return (
    <ErrorLayout
      title={t`Something went wrong`}
      refreshText={t`Refresh page`}
      updateText={t`Update app`}
      errorMessage={error?.message || t`An unexpected error occurred.`}
      className="min-h-[50vh]"
    />
  );
}

export default ErrorFallback;
