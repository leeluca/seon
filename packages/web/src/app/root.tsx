import * as Sentry from '@sentry/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import ErrorFallback from '~/shared/components/common/ErrorFallback';
import LanguageSelector from '~/shared/components/common/LanguageSelector';
import AppStatusMenu from '~/shared/components/common/StatusMenu';
import type { AuthStatus } from '~/types/user';

export interface RouterContext {
  authStatus: AuthStatus;
  isUserInitialized: boolean;
}

export function RootLayout() {
  return (
    <>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" />
    </>
  );
}

export function MainLayout() {
  return (
    <div className="relative min-h-dvh min-w-[375px]">
      <header className="px-3 py-2 sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-(--breakpoint-2xl) content-center justify-between">
          <AppStatusMenu />
        </div>
      </header>

      <main className="px-3 py-2 sm:px-6 sm:py-4 xl:p-8">
        <div className="m-auto mb-24 max-w-(--breakpoint-2xl)">
          <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
            <Outlet />
          </Sentry.ErrorBoundary>
        </div>
      </main>
      {/* TODO: add common footer to all pages at __root.tsx? */}
      <div className="absolute bottom-0 mb-1 px-4 py-2 sm:px-6 sm:py-4 xl:p-8">
        <LanguageSelector />
      </div>
    </div>
  );
}
