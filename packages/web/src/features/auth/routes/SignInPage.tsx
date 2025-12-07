import { Trans, useLingui } from '@lingui/react/macro';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import { SignInForm } from '~/features/auth/components/authForm';
import LanguageSelector from '~/shared/components/common/LanguageSelector';
import { buttonVariants } from '~/shared/components/ui/button';

export function SignInPage() {
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
              <UserIcon className="h-4 w-4" />
              <Trans>Welcome back</Trans>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              <Trans>Sign in to your account</Trans>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              <Trans>Enter your credentials to continue</Trans>
            </p>
          </div>

          <SignInForm
            onSignInCallback={(user) => {
              void navigate({ to: '/' });
              toast.success(t`Welcome back, ${user.name}!`);
            }}
          />
        </div>
      </main>

      <footer className="text-muted-foreground border-t px-6 py-4 text-end text-sm">
        <LanguageSelector />
      </footer>
    </div>
  );
}
