import { useEffect, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { Button, buttonVariants } from '~/components/ui/button';
import db from '~/lib/database';
import { useUser, useUserAction } from '~/states/userContext';
import { generateOfflineUser } from '~/utils';

export const Route = createLazyFileRoute('/')({
  component: Index,
});

function Index() {
  const user = useUser();
  const setUser = useUserAction();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const initializeUser = async () => {
    setIsLoading(true);
    const newUserInfo = generateOfflineUser();
    const newUser = await db
      .insertInto('user')
      .values(newUserInfo)
      .returningAll()
      .executeTakeFirstOrThrow();

    setUser(newUser);
  };

  useEffect(() => {
    if (user) {
      void navigate({ to: '/goals' });
    }
  }, [user, navigate]);

  return (
    <div>
      <div className="mb-10 mt-4 px-6 py-4 xl:p-8">
        <div className="m-auto flex max-w-screen-xl flex-col items-center">
          <h1 className="mb-16 text-3xl">🚧 Seon Goals 🚧</h1>
          <div className="flex items-end gap-8">
            <div>
              <h5 className="mb-1 text-sm font-medium">
                <Trans>First time?</Trans>
              </h5>
              <Button
                size="lg"
                onClick={() => void initializeUser()}
                disabled={isLoading}
              >
                <Trans>Start New</Trans>
              </Button>
            </div>
            <div>
              <h5 className="mb-1 text-sm font-medium">
                <Trans>Already a user?</Trans>
              </h5>
              <Link
                to="/signin"
                preload="intent"
                className={buttonVariants({ variant: 'default', size: 'lg' })}
              >
                <Trans>Sign In</Trans>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
