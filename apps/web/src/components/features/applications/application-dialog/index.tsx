'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Dialog, DialogContent } from '@repo/ui/components/dialog';
import { useApplicationStore } from '../store';
import { EditApplicationForm } from './edit-form';

export function ApplicationDialog({ id }: { id: string | null }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(!!id);

  useEffect(() => {
    setOpen(!!id);
  }, [id]);

  const application = useApplicationStore(
    (state) => state.applications.find((a) => a.id === id) ?? null,
  );

  function close() {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('id');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {application && (
          <EditApplicationForm application={application} onClose={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}
