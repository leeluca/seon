import { create } from 'zustand';

import { BREAKPOINTS } from '~/constants/style';

type Breakpoint = keyof typeof BREAKPOINTS;

interface ViewportState {
  width: number;
  height: number;
  breakpoint: Breakpoint | null;
  isMobile: boolean;
  isTouchScreen: boolean;
  updateViewport: () => void;
}

const getBreakpoint = (width: number): Breakpoint | null => {
  const breakpointEntries = Object.entries(BREAKPOINTS);
  const currentBreakpoint = [...breakpointEntries]
    .reverse()
    .find(([_, value]) => width >= value);

  return currentBreakpoint ? (currentBreakpoint[0] as Breakpoint) : null;
};

export const useViewportStore = create<ViewportState>()((set) => ({
  width: typeof window !== 'undefined' ? window.innerWidth : 0,
  height: typeof window !== 'undefined' ? window.innerHeight : 0,
  breakpoint:
    typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : null,
  isMobile:
    typeof window !== 'undefined' ? window.innerWidth < BREAKPOINTS.sm : false,
  isTouchScreen:
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0,
  // TODO: consider using window.matchMedia('(pointer: coarse)').matches
  updateViewport: () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);

    set({
      width,
      height,
      breakpoint,
      isMobile: width < BREAKPOINTS.sm,
      isTouchScreen: navigator.maxTouchPoints > 0,
    });
  },
}));
