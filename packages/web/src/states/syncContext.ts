import { createContext, useContext } from 'react';

import type { SupabaseConnector } from '~/data/sync/SupabaseConnector';

interface SupabaseConnectorContext {
  connector: SupabaseConnector;
  resetConnector: () => void;
}

export const SupabaseContext = createContext<
  SupabaseConnectorContext | undefined
>(undefined);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
