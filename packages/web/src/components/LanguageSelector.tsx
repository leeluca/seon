import { useState } from 'react';
import { useLingui } from '@lingui/react';
import { CheckIcon, GlobeIcon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

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
import db from '~/lib/database';
import { useUserStore } from '~/states/stores/userStore';
import { cn } from '~/utils/';

interface UpdateUserLanguageArgs {
  userId: string;
  updatedLanguage: keyof typeof LOCALES;
}

async function updateUserLanguage({
  userId,
  updatedLanguage,
}: UpdateUserLanguageArgs) {
  const updatedPreferences = JSON.stringify({
    ...useUserStore.getState().userPreferences,
    language: updatedLanguage,
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

export default function LanguageSelector() {
  const {
    i18n: { locale },
  } = useLingui() as { i18n: { locale: keyof typeof LOCALES } };
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(locale);
  const [user, refetchUser] = useUserStore(
    useShallow((state) => [state.user, state.fetch]),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          // biome-ignore lint/a11y/useSemanticElements: cannot use svg icon inside <select> element
          role="listbox"
          aria-expanded={open}
          className="-ml-2 justify-between p-2"
        >
          <GlobeIcon size={18} className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <p>{LOCALES[locale]}</p>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandGroup>
            {Object.entries(LOCALES).map(([key, label]) => (
              <CommandList key={key}>
                <CommandItem
                  value={key}
                  onSelect={async () => {
                    // FIXME: remove type assertion and validate on runtime
                    setValue(key as keyof typeof LOCALES);
                    user &&
                      (await updateUserLanguage({
                        userId: user.id,
                        updatedLanguage: key as keyof typeof LOCALES,
                      }));
                    refetchUser();

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
