import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CompanyIndustry } from '../../types/company/industry';

export class UpdateCompanyDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  careersUrl?: string;

  @IsOptional()
  @IsEnum(CompanyIndustry)
  industry?: CompanyIndustry;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isMonitored?: boolean;

  @IsOptional()
  @IsDateString()
  lastCheckedAt?: string;
}
