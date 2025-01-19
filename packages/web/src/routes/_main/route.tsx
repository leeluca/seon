import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_main')({
  beforeLoad({ context }) {
    if (!context.isUserInitialized) {
      return redirect({ to: '/' })
    }
  },
})
