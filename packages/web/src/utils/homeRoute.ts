import { useViewportStore } from '~/states/stores/viewportStore';

/**
 * Where an initialized user lands: the daily ritual on mobile, the
 * overview on desktop. Evaluated at navigation time so it follows the
 * current viewport.
 */
export function getHomeRoute(): '/today' | '/goals' {
  return useViewportStore.getState().isMobile ? '/today' : '/goals';
}
