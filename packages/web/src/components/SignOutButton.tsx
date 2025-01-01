import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { usePowerSync } from '@powersync/react';

import usePostSignOut from '~/apis/hooks/usePostSignOut';
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
        <Trans>Sign out</Trans>
      </Button>
      <AlertDialog open={signOutAlertOpen} onOpenChange={setSignOutAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="mb-3 text-xl">
              <Trans>Unsynced data will be lost</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>
                <Trans>
                  Your most recent changes have not been synced yet.
                </Trans>
              </p>
              <p>
                <Trans>
                  If you sign out now, this data will be permanently lost!
                </Trans>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void signOut()}
              className={buttonVariants({ variant: 'destructive' })}
            >
              <Trans>Sign out</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SignOutButton;
