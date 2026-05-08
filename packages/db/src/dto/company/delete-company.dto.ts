import { IsUUID } from 'class-validator';

export class DeleteCompanyDto {
  @IsUUID()
  id: string;
}
