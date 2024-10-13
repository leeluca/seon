import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowBigLeftIcon } from 'lucide-react';
import { toast } from 'sonner';

import SignInForm from '~/components/SignInForm';
import { Button } from '~/components/ui/button';
import { useUserAction } from '~/states/userContext';

export const Route = createLazyFileRoute('/signin')({
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const setUser = useUserAction();
  return (
    <div className="p-6 xl:p-8">
      <Link to="/">
        <Button variant="outline" size="icon">
          <ArrowBigLeftIcon />
        </Button>
      </Link>
      <div className="m-auto mt-4 max-w-md">
        <h1 className="mb-8 font-medium leading-none">Sign In</h1>
        <SignInForm
          onSignInCallback={(user) => {
            setUser({ ...user, useSync: Number(user.useSync) });
            void navigate({ to: '/' });
            toast.success(`Welcome back, ${user.name}!`);
          }}
        />
      </div>
    </div>
  );
}
