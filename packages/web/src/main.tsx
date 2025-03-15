import { StrictMode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';

import './tailwind.css';

import { QueryClientProvider } from '@tanstack/react-query';

import { useFetchAuthStatus } from './apis/hooks/useFetchAuthStatus';
import { COMPATIBILITY_MESSAGE } from './constants/errors';
import { AUTH_CONTEXT_INITIAL_STATE } from './constants/state';
import { queryClient } from './lib/queryClient';
import { defaultLocale } from './locales/i18n';
import { routeTree } from './routeTree.gen';
import { useUserStore } from './states/stores/userStore';
import { isOpfsAvailable } from './utils/storage';

const router = createRouter({
  routeTree,
  context: {
    user: undefined,
    authStatus: AUTH_CONTEXT_INITIAL_STATE,
    isUserInitialized: false,
  },
  defaultPreload: 'viewport',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const [user, isUserInitialized] = useUserStore(
    useShallow((state) => [state.user, state.isInitialized]),
  );
  const { data: authStatus } = useFetchAuthStatus();

  useEffect(() => {
    async function checkCompatibility() {
      const isSupported = await isOpfsAvailable();

      const loadingContainer = document.querySelector('#loading-container');
      if (!loadingContainer) return;

      if (isSupported) {
        loadingContainer.remove();
      } else {
        loadingContainer.innerHTML = COMPATIBILITY_MESSAGE[defaultLocale];
      }
    }

    checkCompatibility();
  }, []);

  return (
    <RouterProvider
      router={router}
      context={{ user, authStatus, isUserInitialized }}
    />
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('no root element');
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}
