'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Company } from '@repo/db/entities/company';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { updateCompanyAction } from '@/actions/company/update';
import { deleteCompanyAction } from '@/actions/company/delete';
import { importCompanyLogoAction } from '@/actions/company/import-company-logo';
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
  const router = useRouter();

  const [pendingChanges, setPendingChanges] = useState<Partial<Company>>({});
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  useEffect(() => {
    setPendingChanges({});
    setPendingLogoFile(null);
  }, [selectedCompanyId]);

  const displayedCompany = useMemo(() => {
    return selectedCompany ?? null;
  }, [selectedCompany]);

  function save(data: Partial<Company>) {
    setPendingChanges((prev) => ({ ...prev, ...data }));
  }

  function handleSaveAll() {
    if (!displayedCompany) return;
    const hasChanges = Object.keys(pendingChanges).length > 0;
    if (!hasChanges && !pendingLogoFile) return;

    startTransition(async () => {
      if (pendingLogoFile) {
        const formData = new FormData();
        formData.append('file', pendingLogoFile);
        const logoResult = await importCompanyLogoAction(
          formData,
          displayedCompany.id,
        );
        if (!logoResult.success) {
          toast.error(logoResult.error || 'Logo upload failed.');
          return;
        }
        setPendingLogoFile(null);
        if (logoResult.updated_at) {
          patchCompany(displayedCompany.id, {
            updated_at: new Date(logoResult.updated_at),
          });
        }
      }

      if (hasChanges) {
        const previous = patchCompany(displayedCompany.id, pendingChanges);
        const result = await updateCompanyAction({
          id: displayedCompany.id,
          ...pendingChanges,
        });
        if (!result.success) {
          if (previous) patchCompany(displayedCompany.id, previous);
          toast.error('Failed to save changes.');
          return;
        }
        setPendingChanges({});
      }

      toast.success('Changes saved.');
    });
  }

  function handleDelete() {
    if (!displayedCompany) return;
    selectCompany(null);
    removeCompany(displayedCompany.id);
    startTransition(async () => {
      await deleteCompanyAction({ id: displayedCompany.id });
      router.refresh();
    });
  }

  const hasPendingChanges =
    Object.keys(pendingChanges).length > 0 || pendingLogoFile !== null;

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
            <CompanyDialogProperties
              company={displayedCompany}
              pendingLogoFile={pendingLogoFile}
              onSave={save}
              onLogoSelect={setPendingLogoFile}
            />
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
