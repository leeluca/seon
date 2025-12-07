import { useEffect } from 'react';

import { useDebounce } from '~/hooks/useDebounce';
import { useViewportStore } from '~/states/stores/viewportStore';

// TODO: move to a hook
export function ViewportHandler() {
  const updateViewport = useViewportStore((state) => state.updateViewport);
  const debouncedUpdate = useDebounce(updateViewport, 200);

  useEffect(() => {
    updateViewport();

    window.addEventListener('resize', debouncedUpdate);

    return () => window.removeEventListener('resize', debouncedUpdate);
  }, [updateViewport, debouncedUpdate]);

  return null;
}
