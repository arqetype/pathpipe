import { IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class AcceptInvitationDto {
  @IsUUID()
  token: UUID;
}
