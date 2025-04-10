import { useMemo, useState } from 'react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
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
import type { GoalFilter as GoalFilterType } from '~/types/goal';
import { cn } from '~/utils';

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
          {filter
            ? filterOptions.find((option) => option.value === filter)?.label
            : t(msg`Filter goals...`)}
          <ChevronDownIcon className="ml-2 opacity-50" size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit min-w-[132px] max-w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {filterOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    setFilter(currentValue as GoalFilterType);
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
