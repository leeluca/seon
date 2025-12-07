import { createLazyFileRoute } from '@tanstack/react-router';

import { SignInPage } from '~/features/auth/routes/SignInPage';

export const Route = createLazyFileRoute('/signin/')({
  component: SignInPage,
});
