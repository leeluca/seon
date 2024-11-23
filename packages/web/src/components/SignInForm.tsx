import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { CircleAlertIcon, LoaderCircleIcon } from 'lucide-react';

import useDelayedExecution from '~/apis/hooks/useDelayedExecution';
import usePostSignIn, {
  PostSignInResponse,
  SignInParams,
} from '~/apis/hooks/usePostSignIn';
import { useIsOnline } from '~/states/isOnlineContext';
import { emailValidator } from '~/utils/validation';
import FormError from './FormError';
import FormItem from './FormItem';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface SignInFormProps {
  onSignInCallback: (user: PostSignInResponse['user']) => void;
}
function SignInForm({ onSignInCallback }: SignInFormProps) {
  const isOnline = useIsOnline();

  const { trigger: postSignIn, error } = usePostSignIn({
    onSuccess: (data) => {
      if (data.result) {
        onSignInCallback(data.user);
      }
    },
  });

  const form = useForm<SignInParams>({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onChange({ value }) {
        const { email, password } = value;
        if (!email.trim() || !password.trim()) {
          return 'Missing required fields';
        }
      },
    },
    onSubmit: async ({ value }) => {
      const { email, password } = value;
      await postSignIn({ email, password });
    },
  });

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
        label="Email"
        labelFor="email"
        className="grid-cols-3"
        labelClassName="text-start"
        required
      >
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return 'Email is required';
            },
            onBlur: ({ value }) => {
              if (!value.trim()) return undefined;
              return emailValidator(value) || undefined;
            },
          }}
        >
          {(field) => {
            const {
              value,
              meta: { errors },
            } = field.state;
            return (
              <FormError.Wrapper
                errors={errors}
                errorClassName="col-span-2 col-start-2"
              >
                <div className="col-span-2">
                  <Input
                    id="email"
                    type="email"
                    value={value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    maxLength={100}
                    autoComplete="username"
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
      <FormItem
        label="Password"
        labelFor="password"
        className="grid-cols-3"
        labelClassName="text-start"
        required
      >
        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return 'Password is required';
            },
          }}
        >
          {(field) => {
            const {
              value,
              meta: { errors },
            } = field.state;
            return (
              <FormError.Wrapper
                errors={[
                  ...errors,
                  error?.status === 401 && 'Invalid credentials',
                ].filter(Boolean)}
                errorClassName="col-span-2 col-start-2"
              >
                <div className="col-span-2">
                  <Input
                    id="password"
                    type="password"
                    value={value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    maxLength={100}
                    autoComplete="current-password"
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
      {!isOnline && (
        <Alert
          variant="warning"
          icon={<CircleAlertIcon size={18} />}
          className="-mb-1 mt-3"
        >
          <AlertTitle>It looks like you are not connected!</AlertTitle>
          <AlertDescription>Sign in will not work. </AlertDescription>
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
                Sign In
              </Button>
            </div>
            <Link
              to="/signup"
              className="text-muted-foreground text-sm"
              preload="intent"
            >
              Create account
            </Link>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}

export default SignInForm;
