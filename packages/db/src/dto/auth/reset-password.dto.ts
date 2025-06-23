import { IsString, IsUUID } from 'class-validator';
import type { UUID } from 'crypto';

export class ResetPasswordDto {
  @IsUUID()
  token: UUID;

  @IsString()
  newPassword: string;
}
