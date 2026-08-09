import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { LayoutGridIcon, PlusIcon, SunIcon } from 'lucide-react';

const tabClass =
  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors';

export default function BottomTabBar() {
  const { t } = useLingui();

  return (
    <nav
      aria-label={t`Primary`}
      className="bg-card/95 border-border fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch">
        <Link
          to="/today"
          className={tabClass}
          activeProps={{ className: 'text-primary' }}
          inactiveProps={{ className: 'text-muted-foreground' }}
        >
          <SunIcon size={20} aria-hidden="true" />
          <Trans>Today</Trans>
        </Link>
        <Link
          to="/goals/new"
          className="flex flex-1 items-center justify-center py-2"
          aria-label={t`New goal`}
        >
          <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-full shadow-md">
            <PlusIcon size={22} aria-hidden="true" />
          </span>
        </Link>
        <Link
          to="/goals"
          className={tabClass}
          activeProps={{ className: 'text-primary' }}
          inactiveProps={{ className: 'text-muted-foreground' }}
        >
          <LayoutGridIcon size={20} aria-hidden="true" />
          <Trans>Goals</Trans>
        </Link>
      </div>
    </nav>
  );
}
