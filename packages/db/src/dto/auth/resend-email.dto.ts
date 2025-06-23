import { IsEmail } from 'class-validator';

export class ResendEmailDto {
  @IsEmail()
  email: string;
}
