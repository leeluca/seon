import { createFileRoute } from '@tanstack/react-router';

function optionalString(value: unknown) {
  return typeof value === 'string' && value ? value : undefined;
}

export const Route = createFileRoute('/verify-email/')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: optionalString(search.email),
    error: optionalString(search.error),
  }),
});
