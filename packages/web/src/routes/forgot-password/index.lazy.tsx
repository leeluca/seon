import { createLazyFileRoute } from '@tanstack/react-router';

import { ForgotPasswordPage } from '~/features/auth/routes/ForgotPasswordPage';

export const Route = createLazyFileRoute('/forgot-password/')({
  component: ForgotPasswordPage,
});
