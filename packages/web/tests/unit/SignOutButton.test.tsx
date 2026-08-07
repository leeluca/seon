import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  customRender as render,
  fireEvent,
  screen,
  waitFor,
} from '../test-utils';

const mocks = vi.hoisted(() => ({
  disconnect: vi.fn(),
  getLocalWorkspaceSummary: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('~/data/db/database', () => ({
  activeWorkspace: {
    kind: 'account',
    syncBinding: { provider: 'powersync', ownerAccountId: 'account-a' },
  },
  powerSyncDb: { disconnect: mocks.disconnect },
}));

vi.mock('~/data/workspace', () => ({
  createWorkspaceExport: vi.fn(),
  downloadWorkspaceExport: vi.fn(),
  flushPendingSignOut: vi.fn(),
  getLocalWorkspaceSummary: mocks.getLocalWorkspaceSummary,
  markPendingSignOut: vi.fn(),
  replaceCurrentWorkspaceWithLocal: vi.fn(),
}));

vi.mock('~/features/auth/hooks/useFetchAuthStatus', () => ({
  createUnauthenticatedAuthStatus: () => ({
    state: 'unauthenticated',
    user: null,
  }),
  useFetchAuthStatus: () => ({
    data: { user: { id: 'account-a' } },
  }),
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

vi.mock('~/shared/components/ui/input', () => ({
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
}));

const { default: SignOutButton } = await import(
  '../../src/shared/components/common/SignOutButton'
);

describe('workspace removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLocalWorkspaceSummary.mockResolvedValue({
      goalCount: 1,
      entryCount: 0,
      pendingUploadCount: 0,
      unresolvedSyncErrorCount: 2,
      hasData: true,
      hasUnsyncedChanges: true,
    });
  });

  it('surfaces rejected changes and requires a recovery export', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SignOutButton />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() =>
      expect(mocks.getLocalWorkspaceSummary).toHaveBeenCalledOnce(),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove workspace from this device',
      }),
    );

    expect(
      screen.getByText(/2 rejected changes.*will not retry automatically/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Export recovery JSON' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove and sign out' }),
    ).toBeDisabled();
  });
});
