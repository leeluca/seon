import usePostSignUp, {
  type PostSignUpResponse,
  type SignUpParams,
} from '~/features/auth/hooks/usePostSignUp';
import { useAuthAppForm, validateRequiredAuthFields } from './useAuthForm';

export interface UseSignUpFormOptions {
  onSuccess?: (result: PostSignUpResponse) => void;
}

export function useSignUpForm(options: UseSignUpFormOptions) {
  const { onSuccess } = options;

  const { mutateAsync: postSignUp } = usePostSignUp({
    onSuccess,
  });

  const defaultValues: SignUpParams = {
    name: '',
    email: '',
    password: '',
  };

  const form = useAuthAppForm({
    defaultValues,
    validators: {
      onChange: ({ value }) => validateRequiredAuthFields(value),
    },
    onSubmit: async ({ value }: { value: SignUpParams }) => {
      const { name, email, password } = value;
      await postSignUp({ name, email, password });
    },
  });

  return { form };
}
