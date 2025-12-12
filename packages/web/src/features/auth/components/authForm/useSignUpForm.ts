import type { Database } from '~/data/db/AppSchema';
import db from '~/data/db/database';
import usePostSignUp, {
  type SignUpParams,
} from '~/features/auth/hooks/usePostSignUp';
import { useUserStore } from '~/states/stores/userStore';
import { useAuthAppForm } from './useAuthForm';

type SignUpFormValues = Omit<SignUpParams, 'uuid'>;

export interface UseSignUpFormOptions {
  onSuccess?: (user: Database['user']) => void;
}

export function useSignUpForm(options: UseSignUpFormOptions) {
  const { onSuccess } = options;

  const userId = useUserStore((state) => state.user.id);
  const refetchUser = useUserStore((state) => state.fetch);

  const { mutateAsync: postSignUp } = usePostSignUp({
    onSuccess: async ({ result, user }) => {
      if (!result) return;

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

      refetchUser();
      onSuccess?.(updatedUser);
    },
  });

  const defaultValues: SignUpFormValues = {
    name: '',
    email: '',
    password: '',
  };

  const form = useAuthAppForm({
    defaultValues,
    validators: {
      onChange({ value }: { value: SignUpFormValues }) {
        const { name, email, password } = value;
        if (!name.trim() || !email.trim() || !password.trim()) {
          return 'Missing required fields';
        }
      },
    },
    onSubmit: async ({ value }: { value: SignUpFormValues }) => {
      const { name, email, password } = value;
      await postSignUp({ uuid: userId, name, email, password });
    },
  });

  return { form };
}
