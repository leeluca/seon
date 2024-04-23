import GoalCard from '~/components/GoalCard';

const Dashboard = () => {
  return (
    <div className="w-full">
      <h1>Dashboard</h1>
      <div className="grid grid-cols-4 m-auto gap-5">
        <GoalCard />
        <GoalCard />
        <GoalCard />
      </div>
    </div>
  );
};

export default Dashboard;
