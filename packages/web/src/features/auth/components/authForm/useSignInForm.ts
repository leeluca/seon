import usePostSignIn, {
  type PostSignInResponse,
  type SignInParams,
} from '~/features/auth/hooks/usePostSignIn';
import { useAuthAppForm } from './useAuthForm';

export interface UseSignInFormOptions {
  onSuccess: (user: PostSignInResponse['user']) => void;
}

export function useSignInForm(options: UseSignInFormOptions) {
  const { onSuccess } = options;

  const { mutateAsync: postSignIn, error } = usePostSignIn({
    onSuccess: (data) => {
      if (data.result) {
        onSuccess(data.user);
      }
    },
  });

  const defaultValues: SignInParams = {
    email: '',
    password: '',
  };

  const form = useAuthAppForm({
    defaultValues,
    validators: {
      onChange({ value }: { value: SignInParams }) {
        const { email, password } = value;
        if (!email.trim() || !password.trim()) {
          return 'Missing required fields';
        }
      },
    },
    onSubmit: async ({ value }: { value: SignInParams }) => {
      const { email, password } = value;
      await postSignIn({ email, password });
    },
  });

  return { form, error };
}
