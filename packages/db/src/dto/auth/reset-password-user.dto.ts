import { IsUUID } from 'class-validator';
import { User } from '../../entities/user';
import type { UUID } from 'node:crypto';

export class ResetPasswordUserDto {
  @IsUUID()
  token: UUID;
}

export type ResetPasswordUserResponseDto = Pick<
  User,
  'id' | 'email' | 'name' | 'avatar_url' | 'is_github_user'
>;
