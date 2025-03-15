import { useEffect, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';

import DemoStart from '~/components/DemoStart';
// import LanguageSelector from '~/components/LanguageSelector';
import { Button, buttonVariants } from '~/components/ui/button';
import db from '~/lib/database';
import { useUserStore } from '~/states/stores/userStore';
import { generateDemoData, isDemo } from '~/utils/demo';

export const Route = createLazyFileRoute('/')({
  component: Index,
});

function Index() {
  const [isUserInitialized, user, fetchUser] = useUserStore(
    useShallow((state) => [state.isInitialized, state.user, state.fetch]),
  );

  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const initializeUser = async () => {
    setIsLoading(true);
    await db
      .insertInto('user')
      .values(user)
      .returningAll()
      .executeTakeFirstOrThrow();
    fetchUser();

    if (isDemo) {
      const existingGoals = await db.selectFrom('goal').selectAll().execute();

      if (existingGoals.length === 0) {
        await generateDemoData(user.id);
      }
    }
  };

  useEffect(() => {
    if (isUserInitialized) {
      void navigate({ to: '/goals' });
    }
  }, [isUserInitialized, navigate]);

  if (isDemo) {
    return (
      <DemoStart onStart={() => void initializeUser()} isLoading={isLoading} />
    );
  }

  return (
    <div>
      <div className="mb-10 mt-4 px-6 py-4 xl:p-8">
        <div className="m-auto flex max-w-screen-xl flex-col items-center">
          <h1 className="mb-16 text-3xl">
            <Trans>🚧 Seon Goals 🚧</Trans>
          </h1>
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
      {/* FIXME: does not work if the user is not initialized */}
      {/* <div className="absolute bottom-0 mb-1 px-6 py-4 xl:p-8"> */}
      {/* <LanguageSelector /> */}
      {/* </div> */}
    </div>
  );
}
