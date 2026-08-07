import { useEffect } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link, useSearch } from '@tanstack/react-router';
import { BadgeCheckIcon, MailCheckIcon } from 'lucide-react';
import { toast } from 'sonner';

import { AuthPageShell } from '~/features/auth/components/AuthPageShell';
import { notifyAuthSessionChanged } from '~/features/auth/authChangeNotification';
import { useFetchAuthStatus } from '~/features/auth/hooks/useFetchAuthStatus';
import { useSendVerificationEmail } from '~/features/auth/hooks/useSendVerificationEmail';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '~/shared/components/ui/alert';
import { Button } from '~/shared/components/ui/button';
import { useIsOnline } from '~/states/isOnlineContext';

export function VerifyEmailPage() {
  const { t } = useLingui();
  const isOnline = useIsOnline();
  const { email, error } = useSearch({ from: '/verify-email/' });
  const { data: authStatus } = useFetchAuthStatus();
  const resendVerification = useSendVerificationEmail({
    onSuccess: () => toast.success(t`Verification email sent.`),
  });
  const verified =
    authStatus.state === 'authenticated' &&
    Boolean(authStatus.user?.emailVerified);

  useEffect(() => {
    if (verified) notifyAuthSessionChanged();
  }, [verified]);

  return (
    <AuthPageShell
      badge={
        <>
          {verified ? (
            <BadgeCheckIcon className="h-4 w-4" />
          ) : (
            <MailCheckIcon className="h-4 w-4" />
          )}
          <Trans>Email verification</Trans>
        </>
      }
      title={
        verified ? (
          <Trans>Your email is verified</Trans>
        ) : (
          <Trans>Check your inbox</Trans>
        )
      }
      description={
        verified ? (
          <Trans>Your account can now connect to sync.</Trans>
        ) : (
          <Trans>Open the verification link to finish setting up sync.</Trans>
        )
      }
    >
      <div className="space-y-4 text-center">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>The verification link could not be used</Trans>
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {verified ? (
          <Link to="/" className="text-primary text-sm hover:underline">
            <Trans>Continue to Seon</Trans>
          </Link>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              {email ? (
                <Trans>A verification message was sent to {email}.</Trans>
              ) : (
                <Trans>Return to sign in after verifying your email.</Trans>
              )}
            </p>
            {email && (
              <Button
                type="button"
                variant="outline"
                disabled={!isOnline || resendVerification.isPending}
                onClick={() => resendVerification.mutate({ email })}
              >
                {resendVerification.isPending
                  ? t`Sending…`
                  : t`Resend verification email`}
              </Button>
            )}
            {resendVerification.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {resendVerification.error.message}
                </AlertDescription>
              </Alert>
            )}
            <div>
              <Link
                to="/signin"
                className="text-primary text-sm hover:underline"
              >
                <Trans>Return to sign in</Trans>
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthPageShell>
  );
}
