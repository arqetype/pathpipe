import { Candidate } from '../entities/candidate';
import { CandidateStage } from '../types/candidate/stage';

export type CandidateSortBy = keyof Candidate;

export interface CandidatesQuery {
  stage?: CandidateStage | CandidateStage[];
  search?: string;
  sortBy?: CandidateSortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number | string;
  limit?: number | string;
}

export interface PaginatedCandidates {
  data: Candidate[];
  total: number;
}
