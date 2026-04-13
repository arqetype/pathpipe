import { ApplicationStatus } from '@repo/db/types/application/status';

export const APPLICATION_STATUS_OPTIONS: {
  status: ApplicationStatus;
  label: string;
  dotClass: string;
}[] = [
  {
    status: ApplicationStatus.WISHLIST,
    label: 'Wishlist',
    dotClass: 'bg-violet-400',
  },
  {
    status: ApplicationStatus.APPLIED,
    label: 'Applied',
    dotClass: 'bg-blue-400',
  },
  {
    status: ApplicationStatus.INTERVIEW,
    label: 'Interview',
    dotClass: 'bg-amber-400',
  },
  { status: ApplicationStatus.OFFER, label: 'Offer', dotClass: 'bg-green-400' },
  {
    status: ApplicationStatus.REJECTED,
    label: 'Rejected',
    dotClass: 'bg-red-400',
  },
  {
    status: ApplicationStatus.GHOSTED,
    label: 'Ghosted',
    dotClass: 'bg-slate-400',
  },
];
