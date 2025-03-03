import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { t } from '@lingui/core/macro';
import { isDemo, getDemoModeMessage } from '~/utils/demo';
import { AUTH_STATUS } from '~/constants/query';

/**
 * Hook to handle demo-mode related functionality
 */
export const useDemoMode = () => {
  const queryClient = useQueryClient();

  const showDemoToast = () => {
    if (isDemo()) {
      toast.info(getDemoModeMessage());
    }
  };

  const mockAuthOperation = async (successCallback?: () => void) => {
    if (isDemo()) {
      showDemoToast();
      
      // Update auth status to appear authenticated in demo mode
      queryClient.setQueryData(AUTH_STATUS.all.queryKey, {
        result: true,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      });
      
      successCallback?.();
      return { result: true };
    }
    return false;
  };

  return {
    isDemo: isDemo(),
    showDemoToast,
    mockAuthOperation,
  };
}; 