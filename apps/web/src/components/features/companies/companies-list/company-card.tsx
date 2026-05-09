'use client';

import { Company } from '@repo/db/entities/company';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { CompanyLogo } from '@/components/shared/company-logo';
import { COMPANY_INDUSTRY_OPTIONS } from '../constants/industry';
import { CompanyCardActions } from '../company-dialog/actions';
import { useCompanyStore } from '../store';

interface CompanyCardProps {
  company: Company;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const selectCompany = useCompanyStore((state) => state.selectCompany);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => selectCompany(company.id)}
    >
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <CompanyLogo
          name={company.name}
          logoUrl={company.logoUrl}
          size={40}
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
