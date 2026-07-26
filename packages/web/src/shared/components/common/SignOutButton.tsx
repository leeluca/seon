import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import { DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';

import { AUTH_STATUS } from '~/constants/query';
import { activeWorkspace, powerSyncDb } from '~/data/db/database';
import {
  clearPendingSignOut,
  createWorkspaceExport,
  downloadWorkspaceExport,
  flushPendingSignOut,
  getLocalWorkspaceSummary,
  markPendingSignOut,
  replaceCurrentWorkspaceWithLocal,
  type LocalWorkspaceSummary,
} from '~/data/workspace';
import {
  createUnauthenticatedAuthStatus,
  useFetchAuthStatus,
} from '~/features/auth/hooks/useFetchAuthStatus';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type SignOutStep = 'choose' | 'remove';

function SignOutButton() {
  const { data } = useFetchAuthStatus();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SignOutStep>('choose');
  const [summary, setSummary] = useState<LocalWorkspaceSummary | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [exportedDataFingerprint, setExportedDataFingerprint] = useState<
    string | null
  >(null);
  const [busy, setBusy] = useState(false);
  const exported = exportedDataFingerprint !== null;

  const accountId =
    data.user?.id ??
    (activeWorkspace.kind === 'account'
      ? activeWorkspace.syncBinding.ownerAccountId
      : null);

  const resetDialog = () => {
    setStep('choose');
    setSummary(null);
    setConfirmation('');
    setExportedDataFingerprint(null);
    setBusy(false);
  };

  const showDialog = async () => {
    setOpen(true);
    try {
      setSummary(await getLocalWorkspaceSummary());
    } catch (error) {
      console.error('Could not inspect the local workspace', error);
      toast.error('Could not inspect pending local changes.');
    }
  };

  const locallySignOut = async () => {
    if (!accountId) return false;
    markPendingSignOut(accountId);
    await powerSyncDb.disconnect();
    const revoked = await flushPendingSignOut();
    if (revoked) clearPendingSignOut();
    queryClient.setQueryData(
      AUTH_STATUS.all.queryKey,
      createUnauthenticatedAuthStatus(),
    );
    return revoked;
  };

  const keepWorkspace = async () => {
    setBusy(true);
    const revoked = await locallySignOut();
    setOpen(false);
    resetDialog();
    toast.success(
      revoked
        ? 'Signed out. This workspace remains editable on this device.'
        : 'Sync is off. Server sign-out will finish when you are online.',
    );
  };

  const exportWorkspace = async () => {
    setBusy(true);
    try {
      const payload = await createWorkspaceExport();
      downloadWorkspaceExport(payload);
      setExportedDataFingerprint(JSON.stringify(payload.data));
    } catch (error) {
      console.error('Could not export the workspace', error);
      toast.error('Could not export the workspace.');
    } finally {
      setBusy(false);
    }
  };

  const removeWorkspace = async () => {
    setBusy(true);
    try {
      const latestSummary = await getLocalWorkspaceSummary();
      setSummary(latestSummary);
      if (
        latestSummary.hasUnsyncedChanges &&
        (!exported || confirmation !== 'REMOVE')
      ) {
        setBusy(false);
        return;
      }
      if (latestSummary.hasUnsyncedChanges) {
        // Capture a final snapshot immediately before removal so another tab's
        // recent local write is not absent from the recovery file.
        const payload = await createWorkspaceExport();
        if (JSON.stringify(payload.data) !== exportedDataFingerprint) {
          downloadWorkspaceExport(payload);
        }
      }
      await locallySignOut();
      await replaceCurrentWorkspaceWithLocal();
      window.location.reload();
    } catch (error) {
      console.error('Could not remove the workspace', error);
      toast.error('Could not remove the workspace. Your data is unchanged.');
      setBusy(false);
    }
  };

  const updateOpen = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (!next) resetDialog();
  };

  return (
    <>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => void showDialog()}
      >
        <Trans>Sign out</Trans>
      </Button>
      <AlertDialog open={open} onOpenChange={updateOpen}>
        <AlertDialogContent>
          {step === 'choose' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out of sync</AlertDialogTitle>
                <AlertDialogDescription>
                  Keeping the workspace lets you continue editing it offline,
                  but only this same account can sync it again. Removing it
                  clears this browser copy; synced data remains in the account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:flex-col">
                <Button disabled={busy} onClick={() => void keepWorkspace()}>
                  Keep workspace on this device
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy || !summary}
                  onClick={() => setStep('remove')}
                >
                  Remove workspace from this device
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => updateOpen(false)}
                >
                  Cancel
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Remove this browser workspace?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {summary?.hasUnsyncedChanges
                    ? `${summary.pendingUploadCount} local change(s) have not reached the server. Export a recovery file, then type REMOVE.`
                    : 'This removes the browser copy. Synced account data can be downloaded again after signing in.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {summary?.hasUnsyncedChanges && (
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void exportWorkspace()}
                  >
                    <DownloadIcon />
                    {exported
                      ? 'Recovery file exported'
                      : 'Export recovery JSON'}
                  </Button>
                  <Input
                    aria-label="Type REMOVE to confirm"
                    placeholder="Type REMOVE"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                </div>
              )}
              <AlertDialogFooter>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setStep('choose')}
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  disabled={
                    busy ||
                    Boolean(
                      summary?.hasUnsyncedChanges &&
                        (!exported || confirmation !== 'REMOVE'),
                    )
                  }
                  onClick={() => void removeWorkspace()}
                >
                  Remove and sign out
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SignOutButton;
