'use server';

import { publicPost } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { ForgotPasswordResponseDto } from '@repo/db/dto/auth/forgot-password.dto';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

class ForgotPasswordEmailActionDto {
  @IsString()
  @IsEmail()
  email: string;
}

class ForgotPasswordEmailActionResponseDto {
  @IsString()
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

export const forgotPasswordEmailAction = action
  .inputDto(ForgotPasswordEmailActionDto)
  .outputDto(ForgotPasswordEmailActionResponseDto)
  .action(async ({ parsedInput }) => {
    const response = await publicPost<ForgotPasswordResponseDto>(
      '/auth/forgot-password',
      {
        email: parsedInput.email,
      },
    );

    if (!response.ok) {
      throw new Error('Failed to send forgot password email');
    }

    return {
      message: response.data.provider_detected
        ? response.data.message
        : 'If you have an account, you will receive a password reset email shortly.',
      is_google_user: response.data.is_google_user,
      is_linkedin_user: response.data.is_linkedin_user,
      provider_detected: response.data.provider_detected,
    };
  });
