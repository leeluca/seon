import { useEffect } from 'react';

import { WORKSPACE_CHANGE_KEY } from '~/constants/storage';

export function WorkspaceChangeListener() {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === WORKSPACE_CHANGE_KEY && event.newValue !== null) {
        window.location.reload();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
