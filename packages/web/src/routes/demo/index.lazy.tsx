import { useEffect, useState } from 'react';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';

import db from '~/data/db/database';
import { initializeLocalProfile } from '~/data/domain/profileRepo';
import DemoStart from '~/shared/components/common/DemoStart';
import { useUserStore } from '~/states/stores/userStore';
import { generateDemoData } from '~/utils/demo';

export const Route = createLazyFileRoute('/demo/')({
  component: IndexRouteComponent,
});

export function IndexRouteComponent() {
  const [isUserInitialized, user, fetchUser] = useUserStore(
    useShallow((state) => [state.isInitialized, state.user, state.fetch]),
  );

  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const initializeUser = async () => {
    setIsLoading(true);
    const { id, name, email, preferences, createdAt, updatedAt } = user;
    await initializeLocalProfile({
      id,
      name,
      email,
      preferences,
      createdAt,
      updatedAt,
    });
    await fetchUser();

    const existingGoals = await db.selectFrom('goal').selectAll().execute();

    if (existingGoals.length === 0) {
      await generateDemoData();
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
