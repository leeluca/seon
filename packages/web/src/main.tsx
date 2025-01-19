import { StrictMode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';

import './tailwind.css';

import { AUTH_CONTEXT_INITIAL_STATE } from './constants/state';
import { routeTree } from './routeTree.gen';
import UserProvider, { useAuthContext, useUser } from './states/userContext';

export const router = createRouter({
  routeTree,
  context: {
    user: undefined,
    authStatus: AUTH_CONTEXT_INITIAL_STATE,
  },
  defaultPreload: 'viewport',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const user = useUser();
  const authStatus = useAuthContext();
  return <RouterProvider router={router} context={{ user, authStatus }} />;
}

function App() {
  useEffect(() => {
    document.querySelector('#loading-container')?.remove();
  }, []);
  return (
    <UserProvider>
      <InnerApp />
    </UserProvider>
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
      <App />
    </StrictMode>,
  );
}
