import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { CircleAlertIcon, LoaderCircleIcon } from 'lucide-react';

import type { PostSignInResponse } from '~/features/auth/hooks/usePostSignIn';
import useDelayedExecution from '~/hooks/useDelayedExecution';
import { useIds } from '~/hooks/useIds';
import FormError from '~/shared/components/common/form/FormError';
import FormItem from '~/shared/components/common/FormItem';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '~/shared/components/ui/alert';
import { Button } from '~/shared/components/ui/button';
import { useIsOnline } from '~/states/isOnlineContext';
import { emailValidator } from '~/utils/validation';
import { useSignInForm } from './useSignInForm';
import { SIGN_IN_FIELD_SUFFIX } from '../../model/constants';

interface SignInFormProps {
  onSignInCallback: (user: PostSignInResponse['user']) => void;
}

function SignInForm({ onSignInCallback }: SignInFormProps) {
  const isOnline = useIsOnline();
  const { t } = useLingui();

  const { form, error } = useSignInForm({
    onSuccess: onSignInCallback,
  });
  const ids = useIds(SIGN_IN_FIELD_SUFFIX);

  const {
    startTimeout: delayedValidation,
    clearExistingTimeout: clearTimeout,
  } = useDelayedExecution(() => void form.validateAllFields('change'));

  return (
    <form
      className="grid gap-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FormItem
        label={t`Email`}
        labelFor={ids.email}
        className="grid-cols-3"
        labelClassName="text-start"
        required
      >
        <form.AppField
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return t`Email is required`;
            },
            onBlur: ({ value }) => {
              if (!value.trim()) return undefined;
              return emailValidator(value) || undefined;
            },
          }}
        >
          {(field) => {
            const {
              meta: { errors },
            } = field.state;
            return (
              <FormError.Wrapper
                errors={errors}
                errorClassName="col-span-2 col-start-2"
              >
                <div className="col-span-2">
                  <field.TextField
                    id={ids.email}
                    type="email"
                    onBlur={field.handleBlur}
                    maxLength={100}
                    autoComplete="username"
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.AppField>
      </FormItem>
      <FormItem
        label={t`Password`}
        labelFor={ids.password}
        className="grid-cols-3"
        labelClassName="text-start"
        required
      >
        <form.AppField
          name="password"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return t`Password is required`;
            },
          }}
        >
          {(field) => {
            const {
              meta: { errors },
            } = field.state;
            return (
              <FormError.Wrapper
                errors={[
                  ...errors,
                  error?.status === 401 ? t`Invalid credentials` : undefined,
                ].filter(Boolean)}
                errorClassName="col-span-2 col-start-2"
              >
                <div className="col-span-2">
                  <field.TextField
                    id={ids.password}
                    type="password"
                    maxLength={100}
                    autoComplete="current-password"
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.AppField>
      </FormItem>
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
      <form.Subscribe
        selector={(state) => [
          state.isSubmitting,
          !state.isTouched || !state.canSubmit || state.isSubmitting,
          state.isTouched,
        ]}
      >
        {([isSubmitting, isSubmitDisabled, isTouched]) => (
          <div className="mt-4 flex w-full flex-col items-center gap-2">
            {/** biome-ignore lint/a11y/noStaticElementInteractions: onMouseEnter/onMouseLeave used to trigger validation */}
            <div
              onMouseEnter={isTouched ? delayedValidation : undefined}
              onMouseLeave={clearTimeout}
              className={isSubmitDisabled ? 'cursor-not-allowed' : undefined}
            >
              <Button
                type="submit"
                className="w-64"
                disabled={isSubmitDisabled}
              >
                {isSubmitting && (
                  <LoaderCircleIcon size={14} className="mr-2 animate-spin" />
                )}
                <Trans>Sign In</Trans>
              </Button>
            </div>
          </div>
        )}
      </form.Subscribe>
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
    </form>
  );
}

export default SignInForm;
