import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import db from '~/.server/db';
import { checkAuth } from '~/.server/services/auth';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await checkAuth(request);
  const { goalId } = params;
  if (!goalId) return json({ entries: [] });

  const entries = await db.entry.findMany({
    where: { goalId: parseInt(goalId, 10) },
  });

  return json({
    entries,
  });
}
