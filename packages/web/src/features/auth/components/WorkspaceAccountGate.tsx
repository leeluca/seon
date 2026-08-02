import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AUTH_STATUS } from '~/constants/query';
import { activeWorkspace, powerSyncDb } from '~/data/db/database';
import {
  bindCurrentWorkspaceToAccount,
  createWorkspaceExport,
  downloadWorkspaceExport,
  flushPendingSignOut,
  getLocalWorkspaceSummary,
  getRemoteWorkspaceSummary,
  markPendingSignOut,
  refreshCurrentAccountProfile,
  replaceCurrentWorkspaceWithAccount,
  type AccountIdentity,
  type LocalWorkspaceSummary,
  type RemoteWorkspaceSummary,
} from '~/data/workspace';
import { useFetchAuthStatus } from '~/features/auth/hooks/useFetchAuthStatus';
import { createUnauthenticatedAuthStatus } from '~/features/auth/hooks/useFetchAuthStatus';
import { useUserStore } from '~/states/stores/userStore';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/shared/components/ui/alert-dialog';
import { Button } from '~/shared/components/ui/button';

interface WorkspaceConflict {
  kind: 'merge-local' | 'switch-account';
  account: AccountIdentity;
  local: LocalWorkspaceSummary;
  remote?: RemoteWorkspaceSummary;
}

function reloadWithActiveWorkspace(): void {
  window.location.reload();
}

/**
 * Resolves authentication separately from workspace ownership. The sync
 * connector cannot start until this gate has selected the one local database
 * that belongs to the authenticated account.
 */
export function WorkspaceAccountGate() {
  const { data, authState } = useFetchAuthStatus();
  const queryClient = useQueryClient();
  const refreshProfileStore = useUserStore((state) => state.fetch);
  const attemptedAccount = useRef<string | null>(null);
  const [conflict, setConflict] = useState<WorkspaceConflict | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authState !== 'unauthenticated') return;
    attemptedAccount.current = null;
    setConflict(null);
    setBusy(false);
  }, [authState]);

  useEffect(() => {
    const user = data.user;
    if (
      authState !== 'authenticated' ||
      !user?.emailVerified ||
      attemptedAccount.current === user.id
    ) {
      return;
    }
    attemptedAccount.current = user.id;
    const account: AccountIdentity = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    let cancelled = false;

    const resolveWorkspace = async () => {
      if (activeWorkspace.kind === 'account') {
        if (activeWorkspace.syncBinding.ownerAccountId !== account.id) {
          const local = await getLocalWorkspaceSummary();
          if (cancelled) return;
          setConflict({
            kind: 'switch-account',
            account,
            local,
          });
          return;
        }

        await refreshCurrentAccountProfile(account);
        if (cancelled) return;
        await refreshProfileStore();
        return;
      }

      const [local, remote] = await Promise.all([
        getLocalWorkspaceSummary(),
        getRemoteWorkspaceSummary(account.id),
      ]);
      if (cancelled) return;
      if (local.hasData && remote.hasData) {
        setConflict({ kind: 'merge-local', account, local, remote });
        return;
      }

      await bindCurrentWorkspaceToAccount(account);
      reloadWithActiveWorkspace();
    };

    void resolveWorkspace().catch((error) => {
      if (cancelled) return;
      attemptedAccount.current = null;
      console.error('Could not resolve the account workspace', error);
      toast.error('Could not prepare sync. Your local workspace is unchanged.');
    });
    return () => {
      cancelled = true;
    };
  }, [authState, data.user, refreshProfileStore]);

  if (!conflict) return null;

  const merge = async () => {
    setBusy(true);
    try {
      await bindCurrentWorkspaceToAccount(conflict.account);
      reloadWithActiveWorkspace();
    } catch (error) {
      console.error('Could not merge the local workspace', error);
      toast.error('Could not merge the workspace. Nothing was removed.');
      setBusy(false);
    }
  };

  const exportAndSwitch = async () => {
    setBusy(true);
    try {
      const payload = await createWorkspaceExport();
      downloadWorkspaceExport(payload);
      await replaceCurrentWorkspaceWithAccount(conflict.account);
      reloadWithActiveWorkspace();
    } catch (error) {
      console.error('Could not replace the current workspace', error);
      toast.error('Could not switch workspaces. The current one is unchanged.');
      setBusy(false);
    }
  };

  const cancelAndSignOut = async () => {
    setBusy(true);
    attemptedAccount.current = null;
    try {
      await markPendingSignOut(conflict.account.id);
      await powerSyncDb.disconnect();
      await flushPendingSignOut();
      queryClient.setQueryData(
        AUTH_STATUS.all.queryKey,
        createUnauthenticatedAuthStatus(),
      );
      setConflict(null);
      setBusy(false);
    } catch (error) {
      console.error('Could not sign out', error);
      toast.error('Could not sign out. The current workspace is unchanged.');
      setBusy(false);
    }
  };

  const switchingAccount = conflict.kind === 'switch-account';
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {switchingAccount
              ? 'This browser already has another account workspace'
              : 'Choose how to combine your local and account data'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {switchingAccount ? (
              <>
                Seon keeps one workspace on a browser. Export the current
                workspace before switching accounts, or cancel and keep using
                it.
              </>
            ) : (
              <>
                This browser has {conflict.local.goalCount} local goal(s), and
                the account already has {conflict.remote?.goalCount ?? 0}.
                Merging keeps both in this workspace. Exporting starts with the
                account workspace and removes this local copy.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-col">
          {!switchingAccount && (
            <Button disabled={busy} onClick={() => void merge()}>
              Merge local and account data
            </Button>
          )}
          <Button
            variant={switchingAccount ? 'default' : 'outline'}
            disabled={busy}
            onClick={() => void exportAndSwitch()}
          >
            Export current data and switch
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void cancelAndSignOut()}
          >
            Cancel and sign out
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
