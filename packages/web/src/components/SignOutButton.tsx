import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { usePowerSync } from '@powersync/react';

import usePostSignOut from '~/features/auth/hooks/usePostSignOut';
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
  const { mutate: signOut, isPending } = usePostSignOut();

  const powerSync = usePowerSync();

  const [signOutAlertOpen, setSignOutAlertOpen] = useState(false);

  const onSignOut = async () => {
    const syncQueue = await powerSync.getAll('SELECT * FROM  ps_crud');
    if (syncQueue.length) {
      setSignOutAlertOpen(true);
    } else {
      signOut();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        disabled={isPending}
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
              <span>
                <Trans>
                  Your most recent changes have not been synced yet.
                </Trans>
              </span>
              <br />
              <span>
                <Trans>
                  If you sign out now, this data will be permanently lost!
                </Trans>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => signOut()}
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
