import { useEffect } from 'react';
import { useUserStore } from '~/states/stores/userStore';
import { generateDemoData } from '~/utils/demoData';
import { isDemo } from '~/utils/demo';
import db from '~/lib/database';

export const useInitializeUser = () => {
  const user = useUserStore(state => state.user);
  const isUserInitialized = useUserStore(state => state.isInitialized);
  
  useEffect(() => {
    const initializeForDemoMode = async () => {
      if (isDemo() && isUserInitialized && user.id) {
        // Check if we already have demo data
        const existingGoals = await db.selectFrom('goal').selectAll().execute();
        
        // Only generate demo data if no goals exist
        if (existingGoals.length === 0) {
          await generateDemoData(user.id);
        }
      }
    };
    
    void initializeForDemoMode();
  }, [isUserInitialized, user.id]);
}; 