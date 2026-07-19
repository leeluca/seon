import { useLayoutEffect } from 'react';
import { useLingui } from '@lingui/react/macro';
import { useRouterState } from '@tanstack/react-router';

export function AppTitle() {
  const { t } = useLingui();

  useLayoutEffect(() => {
    for (const element of document.querySelectorAll('[data-static-title]')) {
      element.remove();
    }
  }, []);

  const leafMatch = useRouterState({
    select: (state) => state.matches.at(-1),
  });
  const routeId = leafMatch?.routeId;

  let pageTitle: string | undefined;

  switch (routeId) {
    case '/demo/':
      pageTitle = t`Seon Demo Mode`;
      break;
    case '/signin/':
      pageTitle = t`Sign In`;
      break;
    case '/signup/':
      pageTitle = t`Sign Up`;
      break;
    case '/_main/goals':
    case '/_main/goals/$id':
      pageTitle = t`Goals`;
      break;
    case '/_main/goals/new':
      pageTitle = t`New Goal`;
      break;
  }

  const title = pageTitle ? `${pageTitle} | Seon` : 'Seon Goals';

  return <title>{title}</title>;
}
