import { IsEnum } from 'class-validator';
import { CompanyStatus } from '../../entities/company';

export class UpdateCompanyStatusDto {
  @IsEnum(CompanyStatus)
  status: CompanyStatus;
}
