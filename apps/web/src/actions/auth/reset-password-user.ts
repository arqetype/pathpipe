'use server';

import { publicPost } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { ResetPasswordUserResponseDto } from '@repo/db/dto/auth/reset-password-user.dto';
import { IsObject, IsString, IsUUID } from 'class-validator';

class ResetPasswordUserActionDto {
  @IsString()
  @IsUUID()
  token: string;
}

class ResetPasswordUserActionResponse {
  @IsObject()
  user: ResetPasswordUserResponseDto;
}

export const resetPasswordUserAction = action
  .inputDto(ResetPasswordUserActionDto)
  .outputDto(ResetPasswordUserActionResponse)
  .action(async ({ parsedInput }) => {
    const { ok, data } = await publicPost<ResetPasswordUserResponseDto>(
      '/auth/reset-password/user',
      parsedInput,
    );

    if (!ok) {
      throw new Error(
        Array.isArray(data.message) && data.message.length > 0
          ? (data.message[0] as string)
          : (data.message as string),
      );
    }

    return { user: data };
  });
