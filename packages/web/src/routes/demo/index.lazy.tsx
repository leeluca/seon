import { useEffect, useState } from 'react';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';

import DemoStart from '~/components/DemoStart';
// import LanguageSelector from '~/components/LanguageSelector';
import db from '~/data/db/database';
import { useUserStore } from '~/states/stores/userStore';
import { generateDemoData } from '~/utils/demo';

export const Route = createLazyFileRoute('/demo/')({
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

    const existingGoals = await db.selectFrom('goal').selectAll().execute();

    if (existingGoals.length === 0) {
      await generateDemoData(user.id);
    }
  };

  useEffect(() => {
    if (isUserInitialized) {
      void navigate({ to: '/goals' });
    }
  }, [isUserInitialized, navigate]);

  return (
    <DemoStart onStart={() => void initializeUser()} isLoading={isLoading} />
  );
}
