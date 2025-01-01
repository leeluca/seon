import { createLazyFileRoute, Outlet } from '@tanstack/react-router';

import LanguageSelector from '~/components/LanguageSelector';
import AppStatusMenu from '~/components/StatusMenu';

export const Route = createLazyFileRoute('/_main')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="relative min-h-screen">
      <div className="px-8 py-4">
        <div className="mx-auto flex max-w-screen-2xl content-center justify-between">
          <AppStatusMenu />
        </div>
      </div>

      <div className="px-6 py-4 xl:p-8">
        <div className="m-auto mb-[90px] max-w-screen-2xl">
          <Outlet />
        </div>
      </div>
      {/* TODO: add common footer to all pages at __root.tsx? */}
      <div className="absolute bottom-0 mb-1 px-6 py-4 xl:p-8">
        <LanguageSelector />
      </div>
    </div>
  );
}
