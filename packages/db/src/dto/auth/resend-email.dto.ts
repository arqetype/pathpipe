import { IsEmail } from 'class-validator';

export class ResendEmailDto {
  @IsEmail()
  email: string;
}

export class ResendEmailResponseDto {
  success: boolean;
}
