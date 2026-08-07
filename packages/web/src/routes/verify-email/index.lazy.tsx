import { createLazyFileRoute } from '@tanstack/react-router';

import { VerifyEmailPage } from '~/features/auth/routes/VerifyEmailPage';

export const Route = createLazyFileRoute('/verify-email/')({
  component: VerifyEmailPage,
});
