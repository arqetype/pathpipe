'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { Company } from '@repo/db/entities/company';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Separator } from '@repo/ui/components/separator';
import { Button } from '@repo/ui/components/button';
import { updateCompanyAction } from '@/actions/company/update';
import { deleteCompanyAction } from '@/actions/company/delete';
import { toast } from 'sonner';
import { RiDeleteBinLine, RiSaveLine } from '@remixicon/react';
import { CompanyDialogHeader } from './header';
import { CompanyDialogProperties } from './properties';
import { useCompanyStore } from '../store';

export function CompanyDialog() {
  const selectedCompanyId = useCompanyStore((state) => state.selectedCompanyId);
  const selectedCompany = useCompanyStore(
    (state) =>
      state.companies.find((c) => c.id === state.selectedCompanyId) ?? null,
  );
  const { selectCompany, patchCompany, removeCompany } = useCompanyStore();
  const [, startTransition] = useTransition();

  const [pendingChanges, setPendingChanges] = useState<Partial<Company>>({});

  useEffect(() => {
    setPendingChanges({});
  }, [selectedCompanyId]);

  const displayedCompany = useMemo(() => {
    return selectedCompany ?? null;
  }, [selectedCompany]);

  function save(data: Partial<Company>) {
    setPendingChanges((prev) => ({ ...prev, ...data }));
  }

  function handleSaveAll() {
    if (!displayedCompany || Object.keys(pendingChanges).length === 0) return;

    const previous = patchCompany(displayedCompany.id, pendingChanges);
    startTransition(async () => {
      const result = await updateCompanyAction({
        id: displayedCompany.id,
        ...pendingChanges,
      });
      if (!result.success) {
        if (previous) patchCompany(displayedCompany.id, previous);
        toast.error('Failed to save changes.');
      } else {
        toast.success('Changes saved.');
        setPendingChanges({});
      }
    });
  }

  function handleDelete() {
    if (!displayedCompany) return;
    selectCompany(null);
    removeCompany(displayedCompany.id);
    deleteCompanyAction({ id: displayedCompany.id });
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  function handleOpenChange(open: boolean) {
    if (!open) {
      selectCompany(null);
    }
  }

  return (
    <Dialog open={!!selectedCompanyId} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sr-only">
          {displayedCompany?.name ?? 'Company details'}
        </div>
        {displayedCompany && (
          <>
            <CompanyDialogHeader company={displayedCompany} onSave={save} />
            <CompanyDialogProperties company={displayedCompany} onSave={save} />
            <DialogFooter>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <RiDeleteBinLine className="size-4 mr-2" />
                Delete
              </Button>
              <Button onClick={handleSaveAll} disabled={!hasPendingChanges}>
                <RiSaveLine className="size-4 mr-2" />
                Save changes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
