import { useEffect, useState } from 'react';
import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { Button } from '~/components/ui/button';
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
              <h5 className="mb-1 text-sm font-medium">Already a user?</h5>
              <Button size="lg">
                <Link to="/signin">Sign In</Link>
              </Button>
            </div>
            <div>
              <h5 className="mb-1 text-sm font-medium">First time?</h5>
              <Button
                size="lg"
                onClick={() => void initializeUser()}
                disabled={isLoading}
              >
                Start New
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
