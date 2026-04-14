import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../../types/application/status';

export class UpdateApplicationStatusDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
