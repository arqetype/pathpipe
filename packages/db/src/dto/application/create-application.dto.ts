import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApplicationStatus } from '../../types/application/status';
import { ApplicationTier } from '../../types/application/tier';

export class CreateApplicationDto {
  @IsString()
  @MinLength(1, { message: 'Company is required' })
  company: string;

  @IsString()
  @MinLength(1, { message: 'Position is required' })
  position: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsEnum(ApplicationTier)
  tier?: ApplicationTier;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  /** ISO 3166-1 alpha-2. Empty is allowed; a half-typed code is not. */
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @IsOptional()
  @IsString()
  appliedAt?: string;
}
