import type { IAuthContext, useUser } from '~/states/userContext';

import React, { Suspense } from 'react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import { Toaster } from '~/components/ui/sonner';
import { TooltipProvider } from '~/components/ui/tooltip';
import OnlineStatusProvider from '~/states/isOnlineContext';
import SyncProvider from '~/states/syncContext';
import { messages as enMessages } from '../locales/en/messages';
import { messages as koMessages } from '../locales/ko/messages';

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
  i18n.load({
    en: enMessages,
    ko: koMessages,
  });
  i18n.activate('ko');

  return (
    <SyncProvider>
      <I18nProvider i18n={i18n}>
        <TooltipProvider delayDuration={400}>
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
