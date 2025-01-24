import React, { Suspense, useEffect } from 'react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import { Toaster } from '~/components/ui/sonner';
import { TooltipProvider } from '~/components/ui/tooltip';
import { defaultLocale, dynamicallyImportLocale } from '~/locales/i18n';
import OnlineStatusProvider from '~/states/isOnlineContext';
import { useUserStore } from '~/states/stores/userStore';
import SyncProvider from '~/states/syncContext';
import type { AuthStatus, User } from '~/types/user';

interface RouterContext {
  user?: User;
  authStatus: AuthStatus;
  isUserInitialized: boolean;
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
  const preferences = useUserStore((state) => state.userPreferences);

  useEffect(() => {
    const locale = preferences?.language ?? defaultLocale;
    void dynamicallyImportLocale(locale);
    document.documentElement.lang = locale;
  }, [preferences]);

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
        </TooltipProvider>
      </I18nProvider>
      <Suspense>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" />
    </SyncProvider>
  );
}
