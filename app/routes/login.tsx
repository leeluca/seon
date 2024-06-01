import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { authenticator } from '~/.server/services/auth';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export async function action({ request }: ActionFunctionArgs) {
  return await authenticator.authenticate('user-pass', request, {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    // throwOnError: true,
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  // If the user is already authenticated redirect to homepage
  return await authenticator.isAuthenticated(request, {
    successRedirect: '/dashboard/goals',
  });
}

export default function Screen() {
  return (
    <Form method="post">
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="email" className="text-right">
            Email
          </Label>
          <Input id="email" name="email" className="col-span-2" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="password" className="text-right">
            Password
          </Label>
          <Input id="password" name="password" className="col-span-2" />
        </div>
      </div>
      <div className="mt-2 flex w-full justify-center">
        <Button className="w-7/12" type="submit">
          Sign In
        </Button>
      </div>
    </Form>
  );
}
