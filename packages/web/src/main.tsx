import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';

import './tailwind.css';

import { routeTree } from './routeTree.gen';
import UserProvider, { useUser } from './states/userContext';

const router = createRouter({
  routeTree,
  context: {
    user: undefined,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const user = useUser();
  return <RouterProvider router={router} context={{ user }} />;
}

function App() {
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
