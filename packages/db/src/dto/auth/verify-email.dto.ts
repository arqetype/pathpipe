import { IsUUID } from 'class-validator';
import type { UUID } from 'crypto';

export class VerifyEmailDto {
  @IsUUID()
  token: UUID;
}

export class VerifyEmailResponseDto {
  success: boolean;
}
