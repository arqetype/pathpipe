import { IsString, IsOptional, MinLength } from 'class-validator';
import { CompanyIndustry } from '../../types/company/industry';

export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  careersUrl?: string;

  @IsOptional()
  industry?: CompanyIndustry;

  @IsOptional()
  @IsString()
  country?: string;
}
