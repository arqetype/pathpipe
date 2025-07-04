'use server';

import { publicPost } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

class ResendEmailActionDto {
  @IsString()
  @IsEmail()
  email: string;
}

class ResendEmailResponse {
  @IsString()
  @IsNotEmpty()
  message: string;
}

export const resendEmailAction = action
  .inputDto(ResendEmailActionDto)
  .outputDto(ResendEmailResponse)
  .action(async ({ parsedInput }) => {
    const { ok, data } = await publicPost('/auth/resend-email', parsedInput);

    if (!ok)
      throw new Error(
        Array.isArray(data.message) && data.message.length > 0
          ? (data.message[0] as string)
          : (data.message as string),
      );

    return { message: 'Verification email resent successfully' };
  });
