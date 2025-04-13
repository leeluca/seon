import { startTransition, useMemo, useState } from 'react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { Check, FilterIcon } from 'lucide-react';

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
import type { GoalFilter as GoalFilterType } from '~/types/goal';
import { cn } from '~/utils';

async function updateDefaultFilter(updatedFilter: GoalFilterType) {
  const userId = useUserStore.getState().user.id;
  const currentPreferences = useUserStore.getState().userPreferences;
  const updatedPreferences = JSON.stringify({
    ...currentPreferences,
    defaultGoalFilter: updatedFilter,
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

interface GoalFilterProps {
  filter: GoalFilterType;
  setFilter: (filter: GoalFilterType) => void;
}

export function GoalFilter({ filter, setFilter }: GoalFilterProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLingui();

  const filterOptions = useMemo(
    () =>
      [
        {
          label: t(msg`All Goals`),
          value: 'all',
        },
        {
          label: t(msg`Completed`),
          value: 'completed',
        },
        {
          label: t(msg`Incomplete`),
          value: 'incomplete',
        },
      ] as const,
    [t],
  );

  // FIXME: change to dropdown component for accessibility
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          // biome-ignore lint/a11y/useSemanticElements: cannot use svg icon inside <select> element
          role="listbox"
          aria-expanded={open}
          className="max-w-[200px] justify-normal"
        >
          <FilterIcon className="opacity-80" size={16} />
          {filter
            ? filterOptions.find((option) => option.value === filter)?.label
            : t(msg`Filter goals...`)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit min-w-[110px] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {filterOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    startTransition(() => {
                      setFilter(currentValue as GoalFilterType);
                    });
                    updateDefaultFilter(currentValue as GoalFilterType);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  <Check
                    className={cn(
                      'ml-auto',
                      filter === option.value ? 'opacity-100' : 'opacity-0',
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
