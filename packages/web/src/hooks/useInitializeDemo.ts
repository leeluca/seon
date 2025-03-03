import { useEffect } from 'react';
import { useUserStore } from '~/states/stores/userStore';
import { generateDemoData } from '~/utils/demoData';
import { isDemo } from '~/utils/demo';
import { generateUUIDs } from '~/utils';
import db from '~/lib/database';

export const useInitializeDemo = () => {
  const user = useUserStore(state => state.user);
  const isUserInitialized = useUserStore(state => state.isInitialized);
  const setUser = useUserStore(state => state.setUser);
  const setIsUserInitialized = useUserStore(state => state.setIsInitialized);
  
  useEffect(() => {
    const initializeDemoUser = async () => {
      if (isDemo() && !isUserInitialized) {
        // Create a demo user
        const { uuid, shortUuid } = generateUUIDs();
        const demoUser = {
          id: user.id || uuid,
          shortId: shortUuid,
          name: "Demo User",
          email: "demo@example.com",
          useSync: 0, // No sync in demo mode
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          preferences: JSON.stringify({})
        };
        
        // Save the demo user to the database
        await db.insertInto('user').values(demoUser).execute();
        
        // Save the demo user to the store
        setUser({
          ...demoUser,
          preferences: "{}"
        });
        setIsUserInitialized(true);
      }
    };
    
    void initializeDemoUser();
  }, [isUserInitialized, user.id, setUser, setIsUserInitialized]);

  useEffect(() => {
    const generateDemoDataIfNeeded = async () => {
      if (isDemo() && isUserInitialized && user.id) {
        // Check if we already have demo data
        const existingGoals = await db.selectFrom('goal').selectAll().execute();
        
        // Only generate demo data if no goals exist
        if (existingGoals.length === 0) {
          await generateDemoData(user.id);
        }
      }
    };
    
    void generateDemoDataIfNeeded();
  }, [isUserInitialized, user.id]);
}; 