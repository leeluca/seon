import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_STATUS } from '~/constants/query';
import { AUTH_CHANGE_KEY } from '~/constants/storage';

const mocks = vi.hoisted(() => ({
  disconnect: vi.fn(),
  resetPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('~/data/db/database', () => ({
  powerSyncDb: { disconnect: mocks.disconnect },
}));

vi.mock('~/lib/auth-client', async () => {
  const actual =
    await vi.importActual<typeof import('~/lib/auth-client')>(
      '~/lib/auth-client',
    );

  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      resetPassword: mocks.resetPassword,
      signOut: mocks.signOut,
    },
  };
});

import { useResetPassword } from '../../src/features/auth/hooks/useResetPassword';

describe('password reset', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.disconnect.mockReset().mockResolvedValue(undefined);
    mocks.resetPassword.mockReset().mockResolvedValue({
      data: { status: true },
      error: null,
    });
    mocks.signOut.mockReset().mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  it('disables the current local session and sync connection', async () => {
    const queryClient = new QueryClient();
    const onSuccess = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useResetPassword({ onSuccess }), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        token: 'reset-token',
        newPassword: 'new-password',
      });
    });

    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(AUTH_STATUS.all.queryKey)).toMatchObject({
      state: 'unauthenticated',
      user: null,
    });
    expect(
      JSON.parse(localStorage.getItem(AUTH_CHANGE_KEY) ?? '{}'),
    ).toMatchObject({ reason: 'password-reset' });
    expect(onSuccess).toHaveBeenCalledWith({ reset: true });
  });
});
