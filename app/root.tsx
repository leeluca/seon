import type { LinksFunction, MetaFunction } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import stylesheet from '~/tailwind.css?url';
import { Toaster } from './components/ui/sonner';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
];

export const meta: MetaFunction = () => {
  return [
    { title: 'Goal dashboard' },
    { name: 'description', content: 'Track and achieve your goals!' },
  ];
};

// TODO: export dashboard layout here, add error boundary
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration getKey={(location) => location.pathname} />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <main className="p-6 xl:p-8">
      <div className="m-auto max-w-screen-xl">
        <Toaster position="top-right" duration={2500} closeButton />
        <Outlet />
      </div>
    </main>
  );
}
