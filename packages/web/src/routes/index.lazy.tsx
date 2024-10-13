import { createLazyFileRoute, Link } from '@tanstack/react-router';

import { Button } from '~/components/ui/button';

export const Route = createLazyFileRoute('/')({
  component: Index,
});
function Index() {
  return (
    <div>
      <div className="mb-10 mt-4 px-6 py-4 xl:p-8">
        <div className="flex max-w-screen-xl flex-col items-center">
          <h1 className="mb-12 text-3xl">🚧 Seon Goals 🚧</h1>
          <div className="flex items-end gap-8">
            <div>
              <h5 className="mb-1 text-sm font-medium">Already a user?</h5>
              <Button size="lg">Log In</Button>
            </div>
            <div>
              <h5 className="mb-1 text-sm font-medium">First time?</h5>
              <Button size="lg">
                <Link to="/goals">Start New</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
