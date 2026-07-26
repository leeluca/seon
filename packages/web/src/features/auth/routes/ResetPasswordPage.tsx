import { useState, type FormEvent } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { KeyRoundIcon } from 'lucide-react';
import { toast } from 'sonner';

import { AuthPageShell } from '~/features/auth/components/AuthPageShell';
import { useResetPassword } from '~/features/auth/hooks/useResetPassword';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '~/shared/components/ui/alert';
import { Button } from '~/shared/components/ui/button';
import { Input } from '~/shared/components/ui/input';
import { Label } from '~/shared/components/ui/label';
import { useIsOnline } from '~/states/isOnlineContext';

export function ResetPasswordPage() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const isOnline = useIsOnline();
  const { token, error: linkError } = useSearch({
    from: '/reset-password/',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string>();
  const resetPassword = useResetPassword({
    onSuccess: () => {
      toast.success(t`Your password has been reset.`);
      void navigate({ to: '/signin' });
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    if (newPassword !== confirmPassword) {
      setValidationError(t`Passwords do not match`);
      return;
    }

    setValidationError(undefined);
    resetPassword.mutate({ token, newPassword });
  };

  const invalidLink = !token || Boolean(linkError);

  return (
    <AuthPageShell
      badge={
        <>
          <KeyRoundIcon className="h-4 w-4" />
          <Trans>Password recovery</Trans>
        </>
      }
      title={<Trans>Choose a new password</Trans>}
      description={<Trans>Use at least eight characters.</Trans>}
    >
      {invalidLink ? (
        <Alert variant="destructive">
          <AlertTitle>
            <Trans>This reset link is invalid or expired</Trans>
          </AlertTitle>
          <AlertDescription>
            <Link to="/forgot-password" className="underline">
              <Trans>Request a new reset link</Trans>
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">
              <Trans>New password</Trans>
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              <Trans>Confirm password</Trans>
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {(validationError || resetPassword.error) && (
            <Alert variant="destructive">
              <AlertTitle>
                <Trans>Couldn't reset your password</Trans>
              </AlertTitle>
              <AlertDescription>
                {validationError || resetPassword.error?.message}
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            type="submit"
            disabled={!isOnline || resetPassword.isPending}
          >
            {resetPassword.isPending ? t`Saving…` : t`Reset password`}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
