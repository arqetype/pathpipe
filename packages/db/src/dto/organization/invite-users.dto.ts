import { IsString, IsOptional, IsEmail } from 'class-validator';

export class InviteUsersDto {
  @IsEmail({}, { each: true })
  userEmails: string[];

  @IsString()
  organizationId: string;

  @IsString()
  @IsOptional()
  roleId?: string;
}
