import { useForm } from '@tanstack/react-form';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import useDelayedExecution from '~/apis/hooks/useDelayedExecution';
import usePostSignUp, { SignUpParams } from '~/apis/hooks/usePostSignUp';
import { MAX_USER_NAME_LENGTH } from '~/constants';
import db from '~/lib/database';
import { useUser, useUserAction } from '~/states/userContext';
import { emailValidator, maxLengthValidator } from '~/utils/validation';
import FormError from './FormError';
import FormItem from './FormItem';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface SignInFormProps {
  onSignUpCallback?: () => void;
}
function SignUpForm({ onSignUpCallback }: SignInFormProps) {
  const user = useUser();

  const { trigger: postSignUp } = usePostSignUp({
    onSuccess: ({ result, user }) => {
      void (async () => {
        if (result) {
          await db
            .updateTable('user')
            .set({
              useSync: Number(user.useSync),
              name: user.name,
              email: user.email,
            })
            .where('id', '=', user.id)
            .execute();
          const updatedUser = await db
            .selectFrom('user')
            .selectAll()
            .where('id', '=', user.id)
            .executeTakeFirstOrThrow();

          setUser(updatedUser);
          toast.success(`Welcome, ${updatedUser.name}!`);
          onSignUpCallback?.();
        }
      })();
    },
  });

  const setUser = useUserAction();

  const form = useForm<Omit<SignUpParams, 'uuid'>>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    validators: {
      onChange({ value }) {
        const { name, email, password } = value;
        if (!name.trim() || !email.trim() || !password.trim()) {
          return 'Missing required fields';
        }
      },
    },
    onSubmit: async ({ value }) => {
      const { name, email, password } = value;
      if (!user) {
        return;
      }
      await postSignUp({ uuid: user.id, name, email, password });
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
        label="Name"
        labelFor="name"
        className="grid-cols-3"
        textClassName="text-start"
        required
      >
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return 'Name is required';
              const errorMessage = maxLengthValidator(
                value,
                MAX_USER_NAME_LENGTH,
                'Name',
              );
              if (errorMessage) return errorMessage;
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
                    id="name"
                    value={value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    maxLength={100}
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
      <FormItem
        label="Email"
        labelFor="email"
        className="grid-cols-3"
        textClassName="text-start"
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
                    value={value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    maxLength={100}
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
        textClassName="text-start"
        required
      >
        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return 'Password is required';
            },
            // TODO: validate password with minimum length etc
            // onBlur: ({ value }) => {
            //   if (!value) return undefined;
            //   return passwordValidator(value) || undefined;
            // },
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
                    id="password"
                    type="password"
                    value={value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    maxLength={100}
                  />
                </div>
              </FormError.Wrapper>
            );
          }}
        </form.Field>
      </FormItem>
      <form.Subscribe
        selector={(state) => [
          state.isSubmitting,
          !state.isTouched || !state.canSubmit || state.isSubmitting,
        ]}
      >
        {([isSubmitting, isSubmitDisabled]) => (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div
              onMouseEnter={delayedValidation}
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
                Sign Up
              </Button>
            </div>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}

export default SignUpForm;
