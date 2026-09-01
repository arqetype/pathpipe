'use client';

import React from 'react';
import { Badge } from '@repo/ui/components/badge';
import { RiCloseLine } from '@remixicon/react';
import type { ExcludedCompany } from '@repo/db/query/job-preference';
import SelectCompany from '@/components/shared/select-company';
import { CompanyLogo } from '@/components/shared/company-logo';

interface ExcludedCompaniesProps {
  values: ExcludedCompany[];
  onChange: (next: ExcludedCompany[]) => void;
}

/**
 * Companies to keep off the board entirely.
 *
 * Picked from the same suggestions as everywhere else rather than typed, because
 * the exclusion is stored by id: a name typed by hand would silently match
 * nothing, which is the one failure mode this list cannot afford.
 */
export function ExcludedCompanies({
  values,
  onChange,
}: ExcludedCompaniesProps) {
  const [draft, setDraft] = React.useState('');

  return (
    <div className="flex flex-col gap-2">
      <SelectCompany
        value={draft}
        onValueChange={setDraft}
        onSelect={(company) => {
          if (!values.some((entry) => entry.id === company.id)) {
            onChange([...values, { id: company.id, name: company.name }]);
          }
          setDraft('');
        }}
        placeholder="Search a company to hide"
      />
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((company) => (
            <Badge
              key={company.id}
              variant="destructive"
              className="gap-1 font-normal"
            >
              <CompanyLogo
                companyId={company.id}
                name={company.name}
                size={12}
                className="size-3 shrink-0 rounded-xs"
              />
              {company.name}
              <button
                type="button"
                aria-label={`Show ${company.name} again`}
                onClick={() =>
                  onChange(values.filter((entry) => entry.id !== company.id))
                }
                className="opacity-70 hover:opacity-100"
              >
                <RiCloseLine className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
