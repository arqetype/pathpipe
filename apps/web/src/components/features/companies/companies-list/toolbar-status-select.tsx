'use client';

import { CompanyStatus } from '@repo/db/entities/company';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { COMPANY_STATUS_TABS } from '../constants/status-tabs';

interface CompaniesStatusSelectProps {
  value: CompanyStatus;
  counts: Record<CompanyStatus, number>;
  onValueChange: (value: string) => void;
}

export function CompaniesStatusSelect({
  value,
  counts,
  onValueChange,
}: CompaniesStatusSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as string)}
    >
      <SelectTrigger>
        <SelectValue
          className="flex items-center gap-1"
          render={() => {
            const activeTabData = COMPANY_STATUS_TABS.find(
              (tab) => tab.value === value,
            );
            const Icon = activeTabData?.icon;
            return (
              <>
                {Icon && <Icon />}
                {activeTabData?.label || 'Status'}
              </>
            );
          }}
        />
      </SelectTrigger>
      <SelectContent className="w-40">
        <SelectGroup>
          {COMPANY_STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <SelectItem
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1"
              >
                <div className="flex items-center gap-1">
                  <Icon />
                  {tab.label}
                  <span className="ml-auto text-muted-foreground">
                    ({counts[tab.value]})
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
