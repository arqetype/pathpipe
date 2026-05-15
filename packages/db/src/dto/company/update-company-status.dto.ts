import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CompanyStatus } from '../../entities/company';

export class UpdateCompanyStatusDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsEnum(CompanyStatus)
  status: CompanyStatus;
}
