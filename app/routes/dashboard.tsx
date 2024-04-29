import GoalCard from '~/components/GoalCard';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { useState } from 'react';
import { Button } from '~/components/ui/button';

const initialGridItems = [0, 1, 2, 3];
const Dashboard = () => {
  const [gridItems, setGridItems] = useState(initialGridItems);

  return (
    <div className="w-full">
      <h1>Dashboard</h1>
      <div className="flex gap-1 my-4">
        <Button
          onClick={() =>
            setGridItems([...gridItems, (gridItems.at(-1) || 0) + 1])
          }
        >
          Add
        </Button>
        <Button onClick={() => setGridItems([...gridItems.toSpliced(-1, 1)])}>
          Remove
        </Button>
        <Button>Shuffle</Button>
      </div>
      <div
        className="gap-6"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, auto))',
        }}
      >
        <LayoutGroup>
          <AnimatePresence>
            {gridItems.map((item) => (
              <GoalCard key={item} />
            ))}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </div>
  );
};

export default Dashboard;

// w-[clamp(360px,60vw,600px)]
