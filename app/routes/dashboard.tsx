import { Link, Outlet } from '@remix-run/react';
import { Button } from '~/components/ui/button';

const Dashboard = () => {
  return (
    <div className="w-full">
      <h1>Dashboard</h1>
      <div className="my-4 flex justify-between">
        <Link to="goals/new">
          <Button>New Goal</Button>
        </Link>
      </div>
      <div
        className="grid grid-flow-row-dense gap-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, auto))',
        }}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;

// w-[clamp(360px,60vw,600px)]
