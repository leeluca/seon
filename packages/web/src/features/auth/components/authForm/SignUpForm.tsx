import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { CircleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';

import { MAX_USER_NAME_LENGTH } from '~/constants';
import type { PostSignUpResponse } from '~/features/auth/hooks/usePostSignUp';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '~/shared/components/ui/alert';
import { useIsOnline } from '~/states/isOnlineContext';
import { maxLengthValidator } from '~/utils/validation';
import { AuthCredentialFields } from './AuthCredentialFields';
import { useSignUpForm } from './useSignUpForm';

interface SignUpFormProps {
  onSignUpCallback?: (result: PostSignUpResponse) => void;
}

function SignUpForm({ onSignUpCallback }: SignUpFormProps) {
  const { t } = useLingui();
  const isOnline = useIsOnline();

  const { form } = useSignUpForm({
    onSuccess: (result) => {
      toast.success(t`Check your email to verify your account.`);
      onSignUpCallback?.(result);
    },
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
          <form.AppField
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value.trim()) return t`Name is required`;
                const errorMessage = maxLengthValidator(
                  value,
                  MAX_USER_NAME_LENGTH,
                  t`Name`,
                );
                if (errorMessage) return errorMessage;
              },
            }}
          >
            {(field) => (
              <field.TextField
                label={t`Name`}
                required
                maxLength={MAX_USER_NAME_LENGTH}
              />
            )}
          </form.AppField>
          <AuthCredentialFields
            form={form}
            fields={{ email: 'email', password: 'password' }}
            passwordAutoComplete="new-password"
          />
          {!isOnline && (
            <Alert
              variant="warning"
              icon={<CircleAlertIcon size={18} />}
              className="mt-3 -mb-1"
            >
              <AlertTitle>
                <Trans>It seems like you are not connected!</Trans>
              </AlertTitle>
              <AlertDescription>
                <Trans>Sign up will not work.</Trans>
              </AlertDescription>
            </Alert>
          )}
          <div className="mt-4 flex flex-col items-center gap-2">
            <form.SubmitButton className="w-64" requireDirty>
              <Trans>Sign Up</Trans>
            </form.SubmitButton>
          </div>
          <div className="mt-2 text-center text-sm">
            <span className="text-muted-foreground">
              <Trans>Already have an account?</Trans>{' '}
            </span>
            <Link
              to="/signin"
              className="text-primary hover:underline"
              preload="intent"
            >
              <Trans>Sign in</Trans>
            </Link>
          </div>
        </form.FormRoot>
      </form.FormLayout>
    </form.AppForm>
  );
}

export default SignUpForm;
