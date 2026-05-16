import { IsUUID } from 'class-validator';

export class RevokeAPIKeyDto {
  @IsUUID()
  id: string;
}
