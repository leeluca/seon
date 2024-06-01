import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/.server/services/auth';

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.logout(request, { redirectTo: '/login' });
}
