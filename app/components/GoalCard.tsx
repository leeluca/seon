import { ChevronDownIcon } from '@radix-ui/react-icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

function ProgressBar() {
  const progressBarWidth = '30%';
  return (
    <>
      <div className="flex h-3 w-[calc(100% + 3rem)] rounded bg-gray-200 [&>:first-child]:rounded-l [&>:last-child]:rounded-r-md -mx-3">
        <div className="h-3 bg-blue-200" style={{ width: progressBarWidth }} />
      </div>
    </>
  );
}
export default function GoalCard() {
  return (
    <Card className="text-center">
      <CardHeader className='p-4'>
        <CardTitle>
          <h3 className="text-2xl">Goal</h3>
        </CardTitle>
        <CardDescription className="text-xs">Category</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* // TODO: align number without the percent */}
        <p className="font-semibold text-4xl text-center">80%</p>
        <div className='flex flex-col gap-2'>
          <div className="flex justify-between text-xs">
            <span>800</span>
            <span>9000</span>
          </div>
          <ProgressBar />
          <div className="flex justify-between text-xs">
            <span>On track</span>
            <span>10 days left</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className='flex justify-between align-middle px-3 pb-3'>
        <span className='text-xs'>Category</span>
        <div className='bg-slate-200 rounded-lg p-1'><ChevronDownIcon/></div>
      </CardFooter>
    </Card>
  );
}
