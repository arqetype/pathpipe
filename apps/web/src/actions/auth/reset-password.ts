'use server';

import { publicPost } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { ResetPasswordResponseDto } from '@repo/db/dto/auth/reset-password.dto';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

class ResetPasswordActionDto {
  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @IsString()
  @IsUUID()
  token: string;
}

class ResetPasswordResponse {
  @IsNotEmpty()
  @IsString()
  message: string;
}

export const resetPasswordAction = action
  .inputDto(ResetPasswordActionDto)
  .outputDto(ResetPasswordResponse)
  .action(async ({ parsedInput }) => {
    const { ok, data } = await publicPost<ResetPasswordResponseDto>(
      '/auth/reset-password',
      {
        newPassword: parsedInput.newPassword,
        confirmPassword: parsedInput.confirmPassword,
        token: parsedInput.token,
      },
    );

    if (!ok) {
      throw new Error(
        Array.isArray(data.message) && data.message.length > 0
          ? (data.message[0] as string)
          : (data.message as string),
      );
    }

    return {
      message: 'Password reset successful',
    };
  });
