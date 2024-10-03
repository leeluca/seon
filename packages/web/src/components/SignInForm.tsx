import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { mutate } from 'swr';

import { postSignIn } from '~/apis/auth';
import { AUTH_STATUS_KEY } from '~/apis/hooks/useAuthStatus';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface SignInFormProps {
  onSignInCallback: () => void;
}
function SignInForm({ onSignInCallback }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit() {
    // TODO: handle error
    const result = await postSignIn({ email, password });

    if (result.result) {
      onSignInCallback();
      await mutate(AUTH_STATUS_KEY);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 py-4">
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
      <div className="mt-2 flex w-full flex-col items-center gap-4">
        <Button className="w-7/12" onClick={() => void handleSubmit()}>
          Sign In
        </Button>
        <Link to="/signup" className="text-muted-foreground text-sm">
          Create account
        </Link>
      </div>
    </div>
  );
}

export default SignInForm;
