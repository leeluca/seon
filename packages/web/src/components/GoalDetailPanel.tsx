import type { ReactElement } from 'react';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  // SheetTrigger,
} from '~/components/ui/sheet';

// FIXME: fix types
interface GoalDetailPanelProps {
  child?: ReactElement;
  title: string;
  description?: string;
  // FIXME: temporary, won't receive as prop
  graphComponent: JSX.Element;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}
export function GoalDetailPanel({
  open,
  onOpenChange,
  title,
  description,
  graphComponent,
}: GoalDetailPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* <SheetTrigger asChild>{child}</SheetTrigger> */}
      <SheetContent className="!w-full !max-w-full sm:!max-w-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {graphComponent}
        <SheetFooter>
          <SheetClose asChild></SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
