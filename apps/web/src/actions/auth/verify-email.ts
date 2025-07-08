'use server';

import { publicPost } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { UUID } from 'crypto';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

class VerifyEmailActionDto {
  @IsUUID()
  token: UUID;
}

class VerifyEmailResponse {
  @IsString()
  @IsNotEmpty()
  message: string;
}

export const verifyEmailAction = action
  .inputDto(VerifyEmailActionDto)
  .outputDto(VerifyEmailResponse)
  .action(async ({ parsedInput }) => {
    const { ok } = await publicPost('/auth/verify-email', parsedInput);

    if (!ok) {
      throw new Error('An error occurred while verifying email');
    }

    return {
      message: 'Email verification successful',
    };
  });
