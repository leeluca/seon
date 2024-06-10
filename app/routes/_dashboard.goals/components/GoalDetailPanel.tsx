import type { ReactElement } from 'react';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet';

interface GoalDetailPanelProps {
  triggerComponent: ReactElement;
  title: string;
  description?: string;
    // FIXME: temporary, won't receive as prop
  graphComponent: JSX.Element;
}
export function GoalDetailPanel({
  triggerComponent,
  title,
  description,
  graphComponent,
}: GoalDetailPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{triggerComponent}</SheetTrigger>
      <SheetContent className="!max-w-3xl">
        <SheetHeader className='mb-4'>
          <SheetTitle className='text-2xl'>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {graphComponent}
        <SheetFooter>
          <SheetClose asChild>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
