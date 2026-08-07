import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen, waitFor } from '../test-utils';

const mocks = vi.hoisted(() => ({
  authStatus: {
    current: {} as {
      authState: string;
      data: { user: Record<string, unknown> | null };
    },
  },
  clearPendingSignOut: vi.fn(),
  disconnect: vi.fn().mockResolvedValue(undefined),
  flushPendingSignOut: vi.fn().mockResolvedValue(true),
  getLocalWorkspaceSummary: vi.fn().mockResolvedValue({
    goalCount: 1,
    entryCount: 0,
    pendingUploadCount: 0,
    unresolvedSyncErrorCount: 0,
    hasData: true,
    hasUnsyncedChanges: false,
  }),
  markPendingSignOut: vi.fn(),
  refreshProfileStore: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

vi.mock('~/data/db/database', () => ({
  activeWorkspace: {
    kind: 'account',
    syncBinding: { provider: 'powersync', ownerAccountId: 'account-a' },
  },
  powerSyncDb: { disconnect: mocks.disconnect },
}));

vi.mock('~/data/workspace', () => ({
  bindCurrentWorkspaceToAccount: vi.fn(),
  clearPendingSignOut: mocks.clearPendingSignOut,
  createWorkspaceExport: vi.fn(),
  downloadWorkspaceExport: vi.fn(),
  flushPendingSignOut: mocks.flushPendingSignOut,
  getLocalWorkspaceSummary: mocks.getLocalWorkspaceSummary,
  getRemoteWorkspaceSummary: vi.fn(),
  markPendingSignOut: mocks.markPendingSignOut,
  refreshCurrentAccountProfile: vi.fn(),
  replaceCurrentWorkspaceWithAccount: vi.fn(),
}));

vi.mock('~/features/auth/hooks/useFetchAuthStatus', () => ({
  createUnauthenticatedAuthStatus: () => ({
    state: 'unauthenticated',
    user: null,
  }),
  useFetchAuthStatus: () => mocks.authStatus.current,
}));

vi.mock('~/states/stores/userStore', () => ({
  useUserStore: (
    selector: (state: { fetch: typeof mocks.refreshProfileStore }) => unknown,
  ) => selector({ fetch: mocks.refreshProfileStore }),
}));

vi.mock('~/shared/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock('~/shared/components/ui/button', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));

const { WorkspaceAccountGate } = await import(
  '../../src/features/auth/components/WorkspaceAccountGate'
);

const accountB = {
  id: 'account-b',
  name: 'Account B',
  email: 'b@example.com',
  emailVerified: true,
};

function authenticatedAsAccountB() {
  return {
    authState: 'authenticated',
    data: { user: accountB },
  };
}

describe('WorkspaceAccountGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.flushPendingSignOut.mockResolvedValue(true);
    mocks.getLocalWorkspaceSummary.mockResolvedValue({
      goalCount: 1,
      entryCount: 0,
      pendingUploadCount: 0,
      unresolvedSyncErrorCount: 0,
      hasData: true,
      hasUnsyncedChanges: false,
    });
    mocks.authStatus.current = authenticatedAsAccountB();
  });

  it('offers the same account conflict again after cancellation and sign-out', async () => {
    const queryClient = new QueryClient();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceAccountGate />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(
        'This browser already has another account workspace',
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel and sign out' }),
    );
    await waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());

    mocks.authStatus.current = {
      authState: 'unauthenticated',
      data: { user: null },
    };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <WorkspaceAccountGate />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(
        screen.queryByText(
          'This browser already has another account workspace',
        ),
      ).not.toBeInTheDocument(),
    );

    mocks.authStatus.current = authenticatedAsAccountB();
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <WorkspaceAccountGate />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(
        'This browser already has another account workspace',
      ),
    ).toBeInTheDocument();
    expect(mocks.getLocalWorkspaceSummary).toHaveBeenCalledTimes(2);
  });
});
