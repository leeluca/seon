import type { IAuthContext, useUser } from '~/states/userContext';

import React, { Suspense, useEffect } from 'react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import { Toaster } from '~/components/ui/sonner';
import { TooltipProvider } from '~/components/ui/tooltip';
import { defaultLocale, dynamicallyImportLocale } from '~/locales/i18n';
import OnlineStatusProvider from '~/states/isOnlineContext';
import SyncProvider from '~/states/syncContext';

interface RouterContext {
  user: ReturnType<typeof useUser>;
  authStatus: IAuthContext;
}
export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

const TanStackRouterDevtools =
  process.env.NODE_ENV === 'development'
    ? React.lazy(() =>
        import('@tanstack/router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      )
    : () => null;

function Root() {
  useEffect(() => {
    void dynamicallyImportLocale(defaultLocale);
  }, []);

  return (
    <SyncProvider>
      <I18nProvider i18n={i18n}>
        <TooltipProvider delayDuration={300}>
          <Toaster
            position="top-right"
            duration={2500}
            closeButton
            className="mt-6"
          />
          <OnlineStatusProvider>
            <Outlet />
          </OnlineStatusProvider>
          <Suspense>
            <TanStackRouterDevtools />
          </Suspense>
        </TooltipProvider>
      </I18nProvider>
    </SyncProvider>
  );
}
