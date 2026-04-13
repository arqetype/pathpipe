import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ApplicationStatus } from '../../types/application/status';
import { ApplicationPriority } from '../../types/application/priority';

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
  @IsEnum(ApplicationPriority)
  priority?: ApplicationPriority;

  @IsOptional()
  @IsString()
  url?: string;

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
