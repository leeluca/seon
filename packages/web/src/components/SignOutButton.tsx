import { useState } from 'react';
import { usePowerSync } from '@powersync/react';

import usePostSignOut from '~/apis/hooks/usePostSignOut';
import { cn } from '~/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button, buttonVariants } from './ui/button';

function SignOutButton() {
  const { trigger: signOut, isMutating } = usePostSignOut();

  const powerSync = usePowerSync();

  const [signOutAlertOpen, setSignOutAlertOpen] = useState(false);

  const onSignOut = async () => {
    const syncQueue = await powerSync.getAll('SELECT * FROM  ps_crud');
    if (syncQueue.length) {
      setSignOutAlertOpen(true);
    } else {
      void signOut();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        disabled={isMutating}
        onClick={() => {
          void onSignOut();
        }}
      >
        Sign out
      </Button>
      <AlertDialog open={signOutAlertOpen} onOpenChange={setSignOutAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="mb-3 text-xl">
              Unsynced data will be lost
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>Your most recent changes have not been synced yet.</p>
              <p> If you sign out now, this data will be permanently lost.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void signOut()}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SignOutButton;
