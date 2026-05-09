'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';

interface Option<T> {
  value: T;
  label: string;
}

interface InlineSelectProps<T> {
  value: T | null | undefined;
  options: Option<T>[];
  placeholder: string;
  onSave: (v: T) => void;
}

export default function InlineSelect<T extends string>({
  value,
  options,
  placeholder,
  onSave,
}: InlineSelectProps<T>) {
  const [draft, setDraft] = useState<T | undefined>(value ?? undefined);

  useEffect(() => setDraft(value ?? undefined), [value]);

  return (
    <Select
      value={draft}
      onValueChange={(v) => {
        setDraft(v as T);
        onSave(v as T);
      }}
    >
      <SelectTrigger className="bg-transparent border-0 text-sm hover:bg-accent w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
