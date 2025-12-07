import { useEffect, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRightIcon, GoalIcon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import db from '~/data/db/database';
import LanguageSelector from '~/shared/components/common/LanguageSelector';
import { Button, buttonVariants } from '~/shared/components/ui/button';
import { useUserStore } from '~/states/stores/userStore';

export const Route = createLazyFileRoute('/')({
  component: Index,
});

function Index() {
  const [isUserInitialized, user, fetchUser] = useUserStore(
    useShallow((state) => [state.isInitialized, state.user, state.fetch]),
  );

  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const initializeUser = async () => {
    setIsLoading(true);
    await db
      .insertInto('user')
      .values(user)
      .returningAll()
      .executeTakeFirstOrThrow();
    fetchUser();
  };

  useEffect(() => {
    if (isUserInitialized) {
      void navigate({ to: '/goals' });
    }
  }, [isUserInitialized, navigate]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="Seon" className="h-8 w-8" />
          <span className="text-lg font-semibold">Seon</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="bg-muted/50 text-muted-foreground mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
            <GoalIcon className="h-4 w-4" />
            <Trans>Track your progress, achieve your goals</Trans>
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            <Trans>Set goals.</Trans>
            <br />
            <span className="text-primary">
              <Trans>Make progress.</Trans>
            </span>
          </h1>

          <p className="text-muted-foreground mb-8 max-w-md text-lg text-balance break-keep">
            <Trans>
              Seon is a goal tracker that helps you stay focused and motivated
              on what matters most.
            </Trans>
          </p>

          {/* CTA buttons */}
          <div className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button
              size="lg"
              onClick={() => void initializeUser()}
              disabled={isLoading}
              className="gap-2"
            >
              <Trans>Get Started</Trans>
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
            <Link
              to="/signin"
              preload="intent"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              <Trans>Sign In</Trans>
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-muted-foreground border-t px-6 py-4 text-end text-sm">
        <LanguageSelector />
      </footer>
    </div>
  );
}
