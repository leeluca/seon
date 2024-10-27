import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowBigLeftIcon } from 'lucide-react';
import { toast } from 'sonner';

import SignInForm from '~/components/SignInForm';
import { buttonVariants } from '~/components/ui/button';
import { cn } from '~/utils';

export const Route = createLazyFileRoute('/signin')({
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  return (
    <div className="p-6 xl:p-8">
      <Link
        to="/"
        className={cn(buttonVariants({ variant: 'default', size: 'default' }))}
      >
        <ArrowBigLeftIcon />
      </Link>
      <div className="m-auto mt-4 max-w-md">
        <h1 className="mb-8 font-medium leading-none">Sign In</h1>
        <SignInForm
          onSignInCallback={(user) => {
            void navigate({ to: '/' });
            toast.success(`Welcome back, ${user.name}!`);
          }}
        />
      </div>
    </div>
  );
}
