import * as Sentry from '@sentry/react';
import { createLazyFileRoute, Outlet } from '@tanstack/react-router';

import ErrorFallback from '~/components/ErrorFallback';
import LanguageSelector from '~/components/LanguageSelector';
import AppStatusMenu from '~/components/StatusMenu';

export const Route = createLazyFileRoute('/_main')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="relative min-h-dvh min-w-[375px]">
      <header className="px-3 py-2 sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-screen-2xl content-center justify-between">
          <AppStatusMenu />
        </div>
      </header>

      <main className="px-3 py-2 sm:px-6 sm:py-4 xl:p-8">
        <div className="m-auto mb-24 max-w-screen-2xl">
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
