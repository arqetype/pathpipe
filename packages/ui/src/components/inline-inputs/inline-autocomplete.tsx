'use client';

import { useEffect, useState } from 'react';
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '@repo/ui/components/autocomplete';

export default function InlineAutocomplete({
  value,
  options,
  placeholder,
  onSave,
}: {
  value: string | null | undefined;
  options: string[];
  placeholder: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => setDraft(value ?? ''), [value]);

  return (
    <Autocomplete
      value={draft}
      onValueChange={(v) => {
        setDraft(v);
        onSave(v);
      }}
      open={open}
      onOpenChange={setOpen}
      items={options}
      itemToStringValue={(item) => item}
      autoHighlight
    >
      <AutocompleteInput
        placeholder={placeholder}
        className="bg-transparent border-0 text-sm hover:bg-accent"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      <AutocompleteContent>
        <AutocompleteEmpty>No match.</AutocompleteEmpty>
        <AutocompleteList>
          {(item) => (
            <AutocompleteItem key={item} value={item}>
              {item}
            </AutocompleteItem>
          )}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}
