import type { PowerSyncDatabase } from '@powersync/web';

declare global {
  interface Window {
    _powersync: PowerSyncDatabase;
  }
}
