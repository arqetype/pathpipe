import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDate,
  Length,
  MaxLength,
} from 'class-validator';
import { ApplicationStatus } from '../../types/application/status';
import { ApplicationTier } from '../../types/application/tier';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsNumber()
  kanbanOrder?: number;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  /** ISO 3166-1 alpha-2. Empty is allowed; a half-typed code is not. */
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string | null;

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
