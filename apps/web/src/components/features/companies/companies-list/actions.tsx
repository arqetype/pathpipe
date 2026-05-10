'use client';

import { useTransition } from 'react';
import type { Company } from '@repo/db/entities/company';
import { CompanyStatus } from '@repo/db/entities/company';
import { Button } from '@repo/ui/components/button';
import { updateCompanyStatusAction } from '@/actions/company/update-status';
import { useCompanyStore } from '../store';
import { toast } from 'sonner';

type CompanyCardActionsProps = {
  company: Company;
};

export function CompanyCardActions({ company }: CompanyCardActionsProps) {
  const { patchCompany } = useCompanyStore();
  const [, startTransition] = useTransition();

  function updateStatus(status: CompanyStatus) {
    if (company.status === status) return;

    const previous = patchCompany(company.id, { status });
    startTransition(async () => {
      const result = await updateCompanyStatusAction({
        id: company.id,
        status,
      });
      if (!result.success) {
        if (previous) patchCompany(company.id, previous);
        toast.error('Failed to update status.');
      } else {
        toast.success(
          `Company ${status === CompanyStatus.APPROVED ? 'accepted' : 'rejected'}.`,
        );
      }
    });
  }

  if (company.status !== CompanyStatus.PENDING) return null;

  return (
    <div className="flex gap-2 pt-2">
      <Button
        size="sm"
        variant="outline"
        className="flex-1"
        onClick={(e) => {
          e.stopPropagation();
          updateStatus(CompanyStatus.REJECTED);
        }}
      >
        Reject
      </Button>
      <Button
        size="sm"
        className="flex-1"
        onClick={(e) => {
          e.stopPropagation();
          updateStatus(CompanyStatus.APPROVED);
        }}
      >
        Accept
      </Button>
    </div>
  );
}
