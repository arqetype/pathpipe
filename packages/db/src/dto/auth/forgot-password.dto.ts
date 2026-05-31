import { IsBoolean, IsEmail, IsOptional } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ForgotPasswordResponseDto {
  success: boolean;
  message: string;

  @IsOptional()
  @IsBoolean()
  is_google_user?: boolean;

  @IsOptional()
  @IsBoolean()
  is_linkedin_user?: boolean;

  @IsOptional()
  @IsBoolean()
  provider_detected?: boolean;
}
