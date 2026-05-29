'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Dialog, DialogContent } from '@repo/ui/components/dialog';
import { useCompanyStore } from '../store';
import { EditCompanyForm } from './edit-form';

export function CompanyDialog({ id }: { id: string | null }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(!!id);

  useEffect(() => {
    setOpen(!!id);
  }, [id]);

  const company = useCompanyStore(
    (state) => state.companies.find((c) => c.id === id) ?? null,
  );

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('id');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) close();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {company && <EditCompanyForm company={company} onClose={close} />}
      </DialogContent>
    </Dialog>
  );
}
