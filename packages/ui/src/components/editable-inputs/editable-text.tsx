'use client';

import { useEffect, useState } from 'react';
import { cn } from '@repo/ui/lib/utils';
import { Input } from '@repo/ui/components/input';

export default function EditableText({
  value,
  placeholder,
  onSave,
  className,
  inputClassName,
}: {
  value: string | null | undefined;
  placeholder: string;
  onSave: (v: string | undefined) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => setDraft(value ?? ''), [value]);

  function commit() {
    const next = draft.trim() || undefined;
    if (next !== (value?.trim() ?? undefined)) onSave(next);
  }

  return (
    <Input
      variant="ghost"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setDraft(value ?? '');
          e.currentTarget.blur();
        }
      }}
      className={cn('h-auto px-2 py-1 -ml-2', className, inputClassName)}
    />
  );
}
