import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { JobPostingClosedReason } from '../../types/job-posting/closed-reason';

/** One posting's verdict after the worker probed its page. */
export class JobPostingValidityDto {
  @IsUUID()
  id: string;

  /** False when the offer is gone; `reason` then says how we know. */
  @IsBoolean()
  alive: boolean;

  @IsOptional()
  @IsEnum(JobPostingClosedReason)
  reason?: JobPostingClosedReason | null;
}

export class ReportJobPostingValidityDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => JobPostingValidityDto)
  results: JobPostingValidityDto[];
}
