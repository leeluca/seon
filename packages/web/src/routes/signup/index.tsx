import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/signup/')({
  beforeLoad({ context }) {
    if (context.authStatus.isSignedIn) {
      return redirect({ to: '/goals' })
    }
  },
})
