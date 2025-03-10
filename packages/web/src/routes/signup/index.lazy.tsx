import { Trans, useLingui } from '@lingui/react/macro';
import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowBigLeftIcon } from 'lucide-react';

// import LanguageSelector from '~/components/LanguageSelector';
import SignUpForm from '~/components/SignUpForm';
import { buttonVariants } from '~/components/ui/button';

export const Route = createLazyFileRoute('/signup/')({
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const { t } = useLingui();
  return (
    <div className="p-6 xl:p-8">
      <Link
        to="/"
        className={buttonVariants({ variant: 'outline', size: 'default' })}
        aria-label={t`Go back`}
      >
        <ArrowBigLeftIcon />
      </Link>
      <div className="m-auto mt-4 max-w-md">
        <h1 className="mb-8 font-medium leading-none">
          <Trans>Sign Up</Trans>
        </h1>
        <SignUpForm onSignUpCallback={() => void navigate({ to: '/' })} />
      </div>
      {/* FIXME: does not work if the user is not initialized */}
      {/* <div className="absolute bottom-0 mb-1 px-6 py-4 xl:p-8">
        <LanguageSelector />
      </div> */}
    </div>
  );
}
