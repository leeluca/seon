import { createFileRoute } from '@tanstack/react-router';

function optionalString(value: unknown) {
  return typeof value === 'string' && value ? value : undefined;
}

export const Route = createFileRoute('/reset-password/')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: optionalString(search.token),
    error: optionalString(search.error),
  }),
});
