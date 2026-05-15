'use client';

import { useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { Company } from '@repo/db/entities/company';
import { CompanyStatus } from '@repo/db/entities/company';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/tabs';
import { CompanyCard } from './company-card';

const STATUS_TABS = [
  { value: CompanyStatus.PENDING, label: 'Pending' },
  { value: CompanyStatus.APPROVED, label: 'Accepted' },
  { value: CompanyStatus.REJECTED, label: 'Rejected' },
] as const;

interface CompaniesTabsProps {
  companies: Company[];
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export function CompaniesTabs({
  companies,
  pendingCount,
  approvedCount,
  rejectedCount,
}: CompaniesTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const statusParam = searchParams?.get('status');
  const [activeTab, setActiveTab] = useState<CompanyStatus>(
    (statusParam as CompanyStatus) || CompanyStatus.PENDING,
  );

  const tabCounts: Record<CompanyStatus, number> = {
    [CompanyStatus.PENDING]: pendingCount,
    [CompanyStatus.APPROVED]: approvedCount,
    [CompanyStatus.REJECTED]: rejectedCount,
  };

  function handleTabChange(value: CompanyStatus) {
    setActiveTab(value);
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (value) params.set('status', value);
      else params.delete('status');
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => handleTabChange(value as CompanyStatus)}
      className="flex flex-col gap-4"
    >
      <TabsList>
        {STATUS_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-full"
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({tabCounts[tab.value]})
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {STATUS_TABS.map((tab) => {
        const tabCompanies = companies.filter((c) => c.status === tab.value);
        return (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tabCompanies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
