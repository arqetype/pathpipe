import { IsUUID } from 'class-validator';
import type { UUID } from 'node:crypto';

export class ResetPasswordUserDto {
  @IsUUID()
  token: UUID;
}
