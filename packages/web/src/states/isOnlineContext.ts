import { createContext, useContext } from 'react';

export const OnlineStatusContext = createContext<boolean>(navigator.onLine);

export const useIsOnline = () => useContext(OnlineStatusContext);
