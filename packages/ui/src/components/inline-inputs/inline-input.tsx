'use client';

import { useEffect, useState } from 'react';
import { Input } from '@repo/ui/components/input';

export default function InlineInput({
  value,
  placeholder,
  type = 'text',

  onSave,
}: {
  value: string | number | null | undefined;
  placeholder: string;
  type?: string;
  onSave: (v: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(String(value ?? ''));

  useEffect(() => setDraft(String(value ?? '')), [value]);

  function commit() {
    const next = draft.trim() || undefined;
    if (next !== String(value ?? '')) onSave(next);
  }

  return (
    <Input
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(String(value ?? ''));
          e.currentTarget.blur();
        }
      }}
      step={type === 'number' ? 1000 : undefined}
      className="w-full bg-transparent border-0 text-sm hover:bg-accent"
    />
  );
}
