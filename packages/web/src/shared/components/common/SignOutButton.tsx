import { Trans } from '@lingui/react/macro';

import usePostSignOut from '~/features/auth/hooks/usePostSignOut';
import { Button } from '../ui/button';

function SignOutButton() {
  const { mutate: signOut, isPending } = usePostSignOut();

  return (
    <Button variant="outline" disabled={isPending} onClick={() => signOut()}>
      <Trans>Sign out</Trans>
    </Button>
  );
}

export default SignOutButton;
