import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@repo/ui/components/textarea';

export default function EditableTextarea({
  value,
  placeholder,
  onSave,
}: {
  value: string | null | undefined;
  placeholder: string;
  onSave: (v: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(value ?? ''), [value]);

  function commit() {
    const next = draft.trim();
    if (next !== value?.trim()) onSave(next);
  }

  return (
    <Textarea
      variant="ghost"
      ref={ref}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setDraft(value ?? '');
          e.currentTarget.blur();
        }
      }}
      rows={4}
      className="w-full min-h-25 p-2 -ml-2"
    />
  );
}
