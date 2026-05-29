'use client';

import { Company } from '@repo/db/entities/company';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { CompanyLogo } from '@/components/shared/company-logo';
import { COMPANY_INDUSTRY_OPTIONS } from '../constants/industry';
import { CompanyCardActions } from './actions';
import { useCompanyStore } from '../store';

interface CompanyCardProps {
  company: Company;
}

export function CompanyCard({ company: initial }: CompanyCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const company =
    useCompanyStore((state) =>
      state.companies.find((c) => c.id === initial.id),
    ) ?? initial;

  function openDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', company.id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={openDialog}
    >
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <CompanyLogo
          companyId={company.id}
          name={company.name}
          size={40}
          cacheKey={
            company.updated_at
              ? new Date(company.updated_at).getTime()
              : undefined
          }
          className="size-10 rounded-lg"
        />
        <CardTitle className="text-base line-clamp-1">{company.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        {company.industry && (
          <span>
            {COMPANY_INDUSTRY_OPTIONS.find((o) => o.value === company.industry)
              ?.label ?? company.industry}
          </span>
        )}
        {company.country && <span>{company.country}</span>}
        <CompanyCardActions company={company} />
      </CardContent>
    </Card>
  );
}
