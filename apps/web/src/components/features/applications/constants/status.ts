import { CandidateStage } from '@repo/db/types/candidate/stage';

export const CANDIDATE_STAGE_OPTIONS: {
  status: CandidateStage;
  label: string;
  dotClass: string;
}[] = [
  {
    status: CandidateStage.APPLIED,
    label: 'Applied',
    dotClass: 'bg-blue-400',
  },
  {
    status: CandidateStage.SCREENING,
    label: 'Screening',
    dotClass: 'bg-violet-400',
  },
  {
    status: CandidateStage.INTERVIEW,
    label: 'Interview',
    dotClass: 'bg-amber-400',
  },
  {
    status: CandidateStage.OFFER,
    label: 'Offer',
    dotClass: 'bg-green-400',
  },
  {
    status: CandidateStage.HIRED,
    label: 'Hired',
    dotClass: 'bg-emerald-500',
  },
  {
    status: CandidateStage.REJECTED,
    label: 'Rejected',
    dotClass: 'bg-red-400',
  },
];
