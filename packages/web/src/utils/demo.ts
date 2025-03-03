/**
 * Check if the app is running in demo mode
 */
export const isDemo = (): boolean => {
  return import.meta.env.VITE_IS_DEMO === 'true';
};

/**
 * Get a friendly message explaining demo mode limitations
 */
export const getDemoModeMessage = (): string => {
  return 'Demo Mode: Syncing features are disabled. All data is stored locally.';
}; 