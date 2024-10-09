import { useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';

import { AUTH_STATUS_KEY } from '~/apis/hooks/useAuthStatus';
import usePostSignUp from '~/apis/hooks/usePostSignUp';
import db from '~/lib/database';
import { useUser, useUserAction } from '~/states/userContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface SignInFormProps {
  onSignUpCallback?: () => void;
}
function SignUpForm({ onSignUpCallback }: SignInFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const user = useUser();

  const { trigger, isMutating } = usePostSignUp();

  const setUser = useUserAction();
  async function handleSubmit() {
    if (!user) return;

    const result = await trigger({ uuid: user.id, name, email, password });

    if (result.result) {
      await db
        .updateTable('user')
        .set({ useSync: 1, name: result.user.name, email: result.user.email })
        .where('id', '=', result.user.id)
        .execute();
      const updatedUser = await db
        .selectFrom('user')
        .selectAll()
        .where('id', '=', result.user.id)
        .executeTakeFirstOrThrow();

      await mutate(AUTH_STATUS_KEY);
      setUser(updatedUser);
      onSignUpCallback && onSignUpCallback();
      toast.success(`Welcome, ${updatedUser.name}!`);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="name" className="text-start">
            Name
          </Label>
          <Input
            id="name"
            name="name"
            className="col-span-2"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="name" className="text-start">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            className="col-span-2"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="password" className="text-start">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            className="col-span-2"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
      </div>
      <div className="mt-2 flex w-full flex-col items-center gap-2">
        <Button
          className="w-7/12"
          onClick={() => void handleSubmit()}
          disabled={isMutating}
        >
          Sign Up
        </Button>
      </div>
    </div>
  );
}

export default SignUpForm;
