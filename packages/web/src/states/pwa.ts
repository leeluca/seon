import { createContext, useContext } from 'react';

export interface PwaContextValue {
  needRefresh: boolean;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

export const PwaContext = createContext<PwaContextValue>({
  needRefresh: false,
  updateServiceWorker: async () => {},
});

export function usePwa() {
  return useContext(PwaContext);
}
