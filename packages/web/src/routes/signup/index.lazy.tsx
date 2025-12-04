import { Trans, useLingui } from '@lingui/react/macro';
import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, TrendingUpIcon } from 'lucide-react';

import { SignUpForm } from '~/components/authForm';
import LanguageSelector from '~/components/LanguageSelector';
import { buttonVariants } from '~/components/ui/button';

export const Route = createLazyFileRoute('/signup/')({
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const { t } = useLingui();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          to="/"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          aria-label={t`Go back`}
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          <Trans>Back</Trans>
        </Link>
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="Seon" className="h-6 w-6" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="bg-muted/50 text-muted-foreground mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
              <TrendingUpIcon className="h-4 w-4" />
              <Trans>Get started</Trans>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              <Trans>Create your account</Trans>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              <Trans>Start tracking your goals today</Trans>
            </p>
          </div>

          <SignUpForm onSignUpCallback={() => void navigate({ to: '/' })} />
        </div>
      </main>

      <footer className="text-muted-foreground border-t px-6 py-4 text-end text-sm">
        <LanguageSelector />
      </footer>
    </div>
  );
}
