import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowBigLeftIcon } from 'lucide-react';

import SignUpForm from '~/components/SignUpForm';
import { Button } from '~/components/ui/button';

export const Route = createLazyFileRoute('/signup')({
  component: SignUp,
  //   beforeLoad // TODO: if authenticaded redirect to /_main
});

function SignUp() {
  const navigate = useNavigate();
  return (
    <div className="p-6 xl:p-8">
      <Link to="/">
        <Button variant="outline" size="icon">
          <ArrowBigLeftIcon />
        </Button>
      </Link>
      <div className="m-auto mt-4 max-w-md">
        <h1 className="mb-8 font-medium leading-none">Sign Up</h1>
        <SignUpForm onSignUpCallback={() => void navigate({ to: '/' })} />
      </div>
    </div>
  );
}
