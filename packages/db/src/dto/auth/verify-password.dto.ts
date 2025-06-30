import { IsUUID } from 'class-validator';
import type { UUID } from 'crypto';

export class VerifyPasswordDto {
  @IsUUID()
  token: UUID;
}
