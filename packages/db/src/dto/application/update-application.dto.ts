import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDate,
} from 'class-validator';
import { ApplicationStatus } from '../../types/application/status';
import { ApplicationTier } from '../../types/application/tier';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsEnum(ApplicationTier)
  tier?: ApplicationTier;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsDate()
  appliedAt?: Date;
}
