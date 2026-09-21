import { ApplicationStatus } from '@repo/db/types/application/status';

/**
 * The dot beside each stage.
 *
 * Status tokens rather than palette values: these same seven meanings show up
 * as badges, chart series and column headers, and a raw `bg-blue-400` here is
 * how one of them ends up a different blue somewhere else. The tokens also
 * carry their own dark-theme values, which a palette shade does not.
 */

export const APPLICATION_STATUS_OPTIONS: {
  status: ApplicationStatus;
  label: string;
  dotClass: string;
}[] = [
  {
    status: ApplicationStatus.WISHLIST,
    label: 'Wishlist',
    dotClass: 'bg-status-accent-solid',
  },
  {
    status: ApplicationStatus.APPLIED,
    label: 'Applied',
    dotClass: 'bg-status-info-solid',
  },
  {
    status: ApplicationStatus.INTERVIEW,
    label: 'Interview',
    dotClass: 'bg-status-warning-solid',
  },
  {
    status: ApplicationStatus.OFFER,
    label: 'Offer',
    dotClass: 'bg-status-success-solid',
  },
  {
    status: ApplicationStatus.REJECTED,
    label: 'Rejected',
    dotClass: 'bg-status-danger-solid',
  },
  {
    status: ApplicationStatus.GHOSTED,
    label: 'Ghosted',
    dotClass: 'bg-status-neutral-solid',
  },
  {
    status: ApplicationStatus.NOT_ELIGIBLE,
    label: 'Not eligible',
    dotClass: 'bg-status-caution-solid',
  },
];
