import * as React from 'react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import {
  ArrowDown01Icon,
  ArrowDown10Icon,
  ArrowDownAZIcon,
  ArrowDownZAIcon,
  Check,
} from 'lucide-react';

import db from '~/data/db/database';
import type { GoalSort } from '~/features/goal/model';
import { Button } from '~/shared/components/ui/button';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '~/shared/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/shared/components/ui/popover';
import { useUserStore } from '~/states/stores/userStore';
import { cn } from '~/utils';

async function updateDefaultSort(updatedSort: GoalSort) {
  const userId = useUserStore.getState().user.id;
  const currentPreferences = useUserStore.getState().userPreferences;
  const updatedPreferences = JSON.stringify({
    ...currentPreferences,
    defaultGoalSort: updatedSort,
  });

  await db
    .updateTable('user')
    .set({
      preferences: updatedPreferences,
    })
    .where('id', '=', userId)
    .execute();
  useUserStore.getState().setPreferences(updatedPreferences);
}

interface GoalSortingProps {
  sort: GoalSort;
  setSort: (sort: GoalSort) => void;
}

export function GoalSorting({ sort, setSort }: GoalSortingProps) {
  const [open, setOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();
  const { t } = useLingui();

  const sortParams = React.useMemo(
    () =>
      [
        {
          label: t(msg`Newest goals`),
          value: 'createdAt desc',
          icon: <ArrowDown10Icon size={16} className="opacity-80" />,
        },
        {
          label: t(msg`Oldest goals`),
          value: 'createdAt asc',
          icon: <ArrowDown01Icon size={16} className="opacity-80" />,
        },
        {
          label: t(msg`Due soon`),
          value: 'targetDate desc',
          icon: <ArrowDown01Icon size={16} className="opacity-80" />,
        },
        {
          label: t(msg`Due later`),
          value: 'targetDate asc',
          icon: <ArrowDown10Icon size={16} className="opacity870" />,
        },
        {
          label: t(msg`Name (A to Z)`),
          value: 'title asc',
          icon: <ArrowDownAZIcon size={16} className="opacity-80" />,
        },
        {
          label: t(msg`Name (Z to A)`),
          value: 'title desc',
          icon: <ArrowDownZAIcon size={16} className="opacity-80" />,
        },
      ] as const,
    [t],
  );

  const selectedSort = React.useMemo(
    () => sortParams.find((param) => param.value === sort),
    [sortParams, sort],
  );

  // FIXME: change to dropdown component for accessibility
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="listbox"
          aria-expanded={open}
          className="max-w-[200px] justify-normal"
        >
          {selectedSort?.icon}
          {selectedSort?.label || t(msg`Select sort...`)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0">
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
