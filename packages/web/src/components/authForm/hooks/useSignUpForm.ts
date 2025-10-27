import usePostSignUp, { type SignUpParams } from '~/apis/hooks/usePostSignUp';
import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
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

  const { trigger: postSignUp } = usePostSignUp({
    onSuccess: ({ result, user }) => {
      void (async () => {
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
      })();
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
