import { Trans, useLingui } from '@lingui/react/macro';
import { CircleAlertIcon, LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import FormError from '~/components/form/FormError';
import FormItem from '~/components/FormItem';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { MAX_USER_NAME_LENGTH } from '~/constants';
import useDelayedExecution from '~/hooks/useDelayedExecution';
import { useIds } from '~/hooks/useIds';
import { useIsOnline } from '~/states/isOnlineContext';
import { emailValidator, maxLengthValidator } from '~/utils/validation';
import { SIGN_UP_FIELD_SUFFIX } from '../constants';
import { useSignUpForm } from '../hooks/useSignUpForm';

interface SignUpFormProps {
  onSignUpCallback?: () => void;
}

function SignUpForm({ onSignUpCallback }: SignUpFormProps) {
  const { t } = useLingui();
  const isOnline = useIsOnline();

  const { form } = useSignUpForm({
    onSuccess: (user) => {
      toast.success(t`Welcome, ${user.name}!`);
      onSignUpCallback?.();
    },
  });
  const ids = useIds(SIGN_UP_FIELD_SUFFIX);

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
        label={t`Name`}
        labelFor={ids.name}
        className="grid-cols-3"
        labelClassName="text-start"
        required
      >
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
                  <field.TextField id={ids.name} maxLength={100} />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.AppField>
      </FormItem>
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
                errors={errors}
                errorClassName="col-span-2 col-start-2"
              >
                <div className="col-span-2">
                  <field.TextField
                    id={ids.password}
                    type="password"
                    maxLength={100}
                    autoComplete="new-password"
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
            <Trans>It seems like you are not connected!</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Sign up will not work.</Trans>
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
          <div className="mt-4 flex flex-col items-center gap-2">
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
                <Trans>Sign Up</Trans>
              </Button>
            </div>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}

export default SignUpForm;
