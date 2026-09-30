import { createLazyFileRoute } from '@tanstack/react-router';

import { SettingsPage } from '~/features/settings/routes/SettingsPage';

export const Route = createLazyFileRoute('/_main/settings')({
  component: SettingsPage,
});
