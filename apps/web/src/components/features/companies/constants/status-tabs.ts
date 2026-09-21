import { RiCheckLine, RiCloseLine, RiTimeLine } from '@remixicon/react';
import { CompanyStatus } from '@repo/db/entities/company';

export const COMPANY_STATUS_TABS = [
  { value: CompanyStatus.PENDING, label: 'Pending', icon: RiTimeLine },
  { value: CompanyStatus.APPROVED, label: 'Accepted', icon: RiCheckLine },
  { value: CompanyStatus.REJECTED, label: 'Rejected', icon: RiCloseLine },
] as const;
