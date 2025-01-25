import * as React from 'react';
import { t } from '@lingui/core/macro';
import { Check, ChevronDownIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import db from '~/lib/database';
import { useUserStore } from '~/states/stores/userStore';
import type { GoalSort } from '~/types/goal';
import { cn } from '~/utils';

const sortParams = [
  {
    label: t`Newest goals`,
    value: 'createdAt desc',
  },
  {
    label: t`Oldest goals`,
    value: 'createdAt asc',
  },
  {
    label: t`Due soon`,
    value: 'targetDate desc',
  },
  {
    label: t`Due later`,
    value: 'targetDate asc',
  },
  {
    label: t`Name (A to Z)`,
    value: 'title asc',
  },
  {
    label: t`Name (Z to A)`,
    value: 'title desc',
  },
] as const;

async function updateDefaultSort(updatedSort: GoalSort) {
  const userId = useUserStore.getState().user.id;
  const currentPreferences = useUserStore.getState().userPreferences;

  await db
    .updateTable('user')
    .set({
      preferences: JSON.stringify({
        ...currentPreferences,
        defaultGoalSort: updatedSort,
      }),
    })
    .where('id', '=', userId)
    .execute();

  useUserStore.getState().fetch();
}

interface GoalSortingProps {
  sort: GoalSort;
  setSort: (sort: GoalSort) => void;
}

export function GoalSorting({ sort, setSort }: GoalSortingProps) {
  const [open, setOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          // biome-ignore lint/a11y/useSemanticElements: cannot use svg icon inside <select> element
          role="listbox"
          aria-expanded={open}
          className="w-[132px] max-w-[200px] justify-between"
          size="sm"
        >
          {sort
            ? sortParams.find((framework) => framework.value === sort)?.label
            : 'Select sort...'}
          <ChevronDownIcon className="ml-2 opacity-50" size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit max-w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {sortParams.map((sortParam) => (
                <CommandItem
                  key={sortParam.value}
                  value={sortParam.value}
                  onSelect={(currentValue) => {
                    startTransition(() => setSort(currentValue as GoalSort));
                    updateDefaultSort(currentValue as GoalSort);
                    setOpen(false);
                  }}
                >
                  {sortParam.label}
                  <Check
                    className={cn(
                      'ml-auto',
                      sort === sortParam.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
