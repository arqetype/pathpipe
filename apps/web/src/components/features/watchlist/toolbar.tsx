'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import SelectCompany from '@/components/shared/select-company';
import { Button } from '@repo/ui/components/button';
import { watchCompanyAction } from '@/actions/company/watch';

export function WatchlistToolbar() {
  const [value, setValue] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    setValue('');
    startTransition(async () => {
      const result = await watchCompanyAction(trimmed);
      if (!result.success) {
        toast.error('Failed to add company to watchlist.');
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-lg font-semibold">Watchlist</h1>
      <div className="flex items-center gap-2">
        <SelectCompany
          value={value}
          onValueChange={setValue}
          onSelect={(company) => handleAdd(company.name)}
          placeholder="Add a company to watch"
          inputClassName="w-72"
        />
        <Button disabled={isPending} onClick={() => handleAdd(value)}>
          Add
        </Button>
      </div>
    </div>
  );
}
