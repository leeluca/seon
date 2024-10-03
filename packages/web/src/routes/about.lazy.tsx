import { useQuery, useStatus } from '@powersync/react';
import { createLazyFileRoute } from '@tanstack/react-router';

import db from '~/lib/database';

export const Route = createLazyFileRoute('/about')({
  component: About,
});

function About() {
  const { data } = useQuery(db.selectFrom('goal').selectAll());
  const status = useStatus();
  console.log(status);
  console.log('data', data);

  return <div className="p-2">Hello from About!</div>;
}
