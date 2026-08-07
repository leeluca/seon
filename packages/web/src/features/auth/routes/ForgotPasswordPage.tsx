import { useState, type FormEvent } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { KeyRoundIcon, MailCheckIcon } from 'lucide-react';

import { AuthPageShell } from '~/features/auth/components/AuthPageShell';
import { useRequestPasswordReset } from '~/features/auth/hooks/useRequestPasswordReset';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '~/shared/components/ui/alert';
import { Button } from '~/shared/components/ui/button';
import { Input } from '~/shared/components/ui/input';
import { Label } from '~/shared/components/ui/label';
import { useIsOnline } from '~/states/isOnlineContext';

export function ForgotPasswordPage() {
  const { t } = useLingui();
  const isOnline = useIsOnline();
  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const requestReset = useRequestPasswordReset({
    onSuccess: () => setRequestSent(true),
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requestReset.mutate({ email: email.trim() });
  };

  return (
    <AuthPageShell
      badge={
        <>
          <KeyRoundIcon className="h-4 w-4" />
          <Trans>Password recovery</Trans>
        </>
      }
      title={<Trans>Reset your password</Trans>}
      description={
        <Trans>We'll send a secure reset link if the account exists.</Trans>
      }
    >
      {requestSent ? (
        <div className="space-y-5 text-center">
          <MailCheckIcon className="text-primary mx-auto h-10 w-10" />
          <p className="text-sm">
            <Trans>
              Check your inbox. For privacy, the same confirmation is shown for
              every email address.
            </Trans>
          </p>
          <Link to="/signin" className="text-primary text-sm hover:underline">
            <Trans>Return to sign in</Trans>
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password-reset-email">
              <Trans>Email</Trans>
            </Label>
            <Input
              id="password-reset-email"
              type="email"
              autoComplete="email"
              required
              maxLength={100}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {!isOnline && (
            <Alert variant="warning">
              <AlertTitle>
                <Trans>You are offline</Trans>
              </AlertTitle>
              <AlertDescription>
                <Trans>Reconnect before requesting a reset link.</Trans>
              </AlertDescription>
            </Alert>
          )}

          {requestReset.error && (
            <Alert variant="destructive">
              <AlertTitle>
                <Trans>Couldn't request a reset link</Trans>
              </AlertTitle>
              <AlertDescription>{requestReset.error.message}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            type="submit"
            disabled={!isOnline || requestReset.isPending}
          >
            {requestReset.isPending
              ? t`Sending reset link…`
              : t`Send reset link`}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
