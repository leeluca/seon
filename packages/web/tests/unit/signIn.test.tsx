import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signInEmail: vi.fn(),
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
      signIn: {
        ...actual.authClient.signIn,
        email: authMocks.signInEmail,
      },
    },
  };
});

import usePostSignIn from '../../src/features/auth/hooks/usePostSignIn';

function createWrapper() {
  const queryClient = new QueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('email sign in', () => {
  beforeEach(() => {
    localStorage.clear();
    authMocks.signInEmail.mockReset();
    authMocks.signInEmail.mockResolvedValue({
      data: {
        user: {
          id: 'account-a',
          name: 'Account A',
          email: 'a@example.com',
          emailVerified: true,
        },
      },
      error: null,
    });
  });

  it('lets the calling UI control navigation after a successful sign-in', async () => {
    const { result } = renderHook(() => usePostSignIn(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'a@example.com',
        password: 'password',
      });
    });

    expect(authMocks.signInEmail).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: 'password',
      rememberMe: true,
    });
  });
});
