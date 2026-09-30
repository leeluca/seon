import { lazy, Suspense } from 'react';
import * as Sentry from '@sentry/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import BottomTabBar from '~/shared/components/common/BottomTabBar';
import ErrorFallback from '~/shared/components/common/ErrorFallback';
import { SettingsButton } from '~/shared/components/common/SettingsButton';
import UpdatePrompt from '~/shared/components/common/UpdatePrompt';
import type { AuthStatus } from '~/types/user';
import { isDemo } from '~/utils/demo';
import { AppTitle } from './metadata';

const LazyDemoIndicator = lazy(
  () => import('~/shared/components/common/DemoIndicator'),
);

export interface RouterContext {
  authStatus: AuthStatus;
  isUserInitialized: boolean;
}

export function RootLayout() {
  return (
    <>
      <AppTitle />
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" />
    </>
  );
}

export function MainLayout() {
  return (
    <div className="relative min-h-dvh">
      <header className="px-3 py-2 sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-(--breakpoint-2xl) items-center justify-end gap-2">
          <UpdatePrompt />
          {isDemo && (
            <Suspense fallback={null}>
              <LazyDemoIndicator />
            </Suspense>
          )}
          <SettingsButton showSyncState={!isDemo} />
        </div>
      </header>

      <main className="px-3 py-2 sm:px-6 sm:py-4 xl:p-8">
        <div className="m-auto mb-24 max-w-(--breakpoint-2xl)">
          <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
            <Outlet />
          </Sentry.ErrorBoundary>
        </div>
      </main>
      <BottomTabBar />
    </div>
  );
}
