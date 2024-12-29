import { useState } from 'react';
import { useLingui } from '@lingui/react';
import { CheckIcon, GlobeIcon } from 'lucide-react';

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
import { LOCALES } from '~/constants/locales';
import { dynamicallyImportLocale } from '~/locales/i18n';
import { cn } from '~/utils/';

export default function LanguageSelector() {
  const {
    i18n: { locale },
  } = useLingui();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(locale);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="-ml-2 justify-between p-2"
        >
          <GlobeIcon size={18} className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <p>{LOCALES[locale as keyof typeof LOCALES]}</p>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandGroup>
            {Object.entries(LOCALES).map(([key, label]) => (
              <CommandList key={key}>
                <CommandItem
                  value={key}
                  onSelect={() => {
                    setValue(key);
                    void dynamicallyImportLocale(key as keyof typeof LOCALES);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === key ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {label}
                </CommandItem>
              </CommandList>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
