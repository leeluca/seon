import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { powerSyncDb } from '~/data/db/database';
import {
  detectLegacyWorkspaceData,
  discardLegacyWorkspaceData,
  downloadWorkspaceExport,
  exportLegacyWorkspaceData,
  importLegacyWorkspaceData,
  type LegacyWorkspaceCandidate,
} from '~/data/workspace';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';

export function LegacyWorkspaceRecovery() {
  const [candidate, setCandidate] = useState<LegacyWorkspaceCandidate | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    void detectLegacyWorkspaceData()
      .then(([first]) => setCandidate(first ?? null))
      .catch((error) => {
        console.error('Could not inspect the legacy workspace', error);
      });
  }, []);

  if (!candidate) return null;

  const importLegacy = async () => {
    setBusy(true);
    try {
      const result = await importLegacyWorkspaceData(candidate, powerSyncDb);
      await discardLegacyWorkspaceData(candidate);
      toast.success(
        `Recovered ${result.imported.goals} goal(s) and ${result.imported.entries} entry/entries.`,
      );
      window.location.reload();
    } catch (error) {
      console.error('Could not recover the legacy workspace', error);
      toast.error('Recovery failed. The old database was not removed.');
      setBusy(false);
    }
  };

  const exportLegacy = async () => {
    setBusy(true);
    try {
      downloadWorkspaceExport(await exportLegacyWorkspaceData(candidate));
      toast.success('Legacy workspace exported.');
    } catch (error) {
      console.error('Could not export the legacy workspace', error);
      toast.error('Could not export the old workspace.');
    } finally {
      setBusy(false);
    }
  };

  const discardLegacy = async () => {
    setBusy(true);
    try {
      await discardLegacyWorkspaceData(candidate);
      setCandidate(null);
    } catch (error) {
      console.error('Could not discard the legacy workspace', error);
      toast.error('Could not remove the old workspace.');
      setBusy(false);
    }
  };

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Recover data from the previous Seon database?
          </AlertDialogTitle>
          <AlertDialogDescription>
            We found {candidate.goalCount} goal(s) and {candidate.entryCount}{' '}
            entry/entries in the old browser database. Authentication and old
            sync tokens are not imported.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {confirmDiscard && (
          <p className="text-destructive text-sm">
            This permanently deletes the old browser copy. Export it first if
            you may need a recovery file.
          </p>
        )}
        <AlertDialogFooter className="sm:flex-col">
          <Button disabled={busy} onClick={() => void importLegacy()}>
            Recover into this workspace
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void exportLegacy()}
          >
            Export old data as JSON
          </Button>
          {confirmDiscard ? (
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void discardLegacy()}
            >
              Permanently delete old copy
            </Button>
          ) : (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirmDiscard(true)}
            >
              Discard old copy
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setCandidate(null)}
          >
            Later
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
