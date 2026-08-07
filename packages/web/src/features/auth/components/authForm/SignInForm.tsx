import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { CircleAlertIcon } from 'lucide-react';

import type { PostSignInResponse } from '~/features/auth/hooks/usePostSignIn';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '~/shared/components/ui/alert';
import { useIsOnline } from '~/states/isOnlineContext';
import { AuthCredentialFields } from './AuthCredentialFields';
import { useSignInForm } from './useSignInForm';

interface SignInFormProps {
  onSignInCallback: (user: PostSignInResponse['user']) => void;
}

function SignInForm({ onSignInCallback }: SignInFormProps) {
  const isOnline = useIsOnline();
  const { t } = useLingui();

  const { form, error } = useSignInForm({
    onSuccess: onSignInCallback,
  });

  return (
    <form.AppForm>
      <form.FormLayout
        itemClassName="grid-cols-3"
        labelClassName="text-start"
        controlClassName="col-span-2"
        errorClassName="col-span-2 col-start-2"
      >
        <form.FormRoot className="grid gap-4 py-4">
          <AuthCredentialFields
            form={form}
            fields={{ email: 'email', password: 'password' }}
            passwordAutoComplete="current-password"
            passwordErrors={[
              error?.status === 401 ? t`Invalid credentials` : undefined,
              error?.status === 403
                ? t`Verify your email before signing in`
                : undefined,
            ]}
          />
          {!isOnline && (
            <Alert
              variant="warning"
              icon={<CircleAlertIcon size={18} />}
              className="mt-3 -mb-1"
            >
              <AlertTitle>
                <Trans>It looks like you are offline!</Trans>
              </AlertTitle>
              <AlertDescription>
                <Trans>Sign in will not work.</Trans>
              </AlertDescription>
            </Alert>
          )}
          <div className="mt-4 flex w-full flex-col items-center gap-2">
            <form.SubmitButton className="w-64" requireDirty>
              <Trans>Sign In</Trans>
            </form.SubmitButton>
          </div>
          <div className="text-center text-sm">
            <Link
              to="/forgot-password"
              className="text-primary hover:underline"
              preload="intent"
            >
              <Trans>Forgot your password?</Trans>
            </Link>
          </div>
          <div className="mt-2 text-center text-sm">
            <span className="text-muted-foreground">
              <Trans>Don't have an account?</Trans>{' '}
            </span>
            <Link
              to="/signup"
              className="text-primary hover:underline"
              preload="intent"
            >
              <Trans>Sign up</Trans>
            </Link>
          </div>
        </form.FormRoot>
      </form.FormLayout>
    </form.AppForm>
  );
}

export default SignInForm;
