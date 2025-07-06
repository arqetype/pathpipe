import { IsString, IsOptional, Length } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @Length(2, 50)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
