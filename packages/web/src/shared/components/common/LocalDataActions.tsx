import { useState } from 'react';
import { DownloadIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { resetLocalDatabase } from '~/data/db/reset';
import {
  createLegacyWorkspaceExport,
  downloadLegacyWorkspaceExport,
} from '~/data/domain/workspaceExport';
import usePostSignOut from '~/features/auth/hooks/usePostSignOut';
import { useUserStore } from '~/states/stores/userStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button, buttonVariants } from '../ui/button';

export function LocalDataActions() {
  const usesSync = useUserStore((state) => Boolean(state.user.useSync));
  const { mutateAsync: signOut } = usePostSignOut();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      downloadLegacyWorkspaceExport(await createLegacyWorkspaceExport());
      toast.success('Local data exported.');
    } catch (error) {
      console.error('Failed to export local data:', error);
      toast.error('Could not export local data.');
    } finally {
      setIsExporting(false);
    }
  };

  const removeData = async () => {
    setIsRemoving(true);
    try {
      if (usesSync) await signOut();
      const removed = await resetLocalDatabase();
      if (!removed) throw new Error('Local database removal failed');
      location.reload();
    } catch (error) {
      console.error('Failed to remove local data:', error);
      toast.error('Could not remove local data from this device.');
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        disabled={isExporting || isRemoving}
        onClick={() => void exportData()}
      >
        <DownloadIcon />
        Export local data
      </Button>
      <Button
        variant="destructive"
        disabled={isRemoving}
        onClick={() => setRemoveDialogOpen(true)}
      >
        <Trash2Icon />
        Remove device data
      </Button>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove all data from this device?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the local profile, goals, entries, and
              queued changes. Export first if you may need this data later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              className={buttonVariants({ variant: 'destructive' })}
              onClick={() => void removeData()}
            >
              Remove device data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
