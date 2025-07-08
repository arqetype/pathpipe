'use server';

import { publicPost } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { IsEmail, IsString } from 'class-validator';

class ForgotPasswordEmailActionDto {
  @IsString()
  @IsEmail()
  email: string;
}

class ForgotPasswordEmailActionResponseDto {
  @IsString()
  message: string;
}

export const forgotPasswordEmailAction = action
  .inputDto(ForgotPasswordEmailActionDto)
  .outputDto(ForgotPasswordEmailActionResponseDto)
  .action(async ({ parsedInput }) => {
    const { ok } = await publicPost('/auth/forgot-password', {
      email: parsedInput.email,
    });

    if (!ok) {
      throw new Error('Failed to send forgot password email');
    }

    return {
      message:
        'If you have an account, you will receive a password reset email shortly.',
    };
  });
