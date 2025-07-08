'use server';

import { get, post } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import {
  EnableOtpDto,
  EnableOtpResponseDto,
} from '@repo/db/dto/auth/enable-otp.dto';
import { revalidatePath } from 'next/cache';

export const enableOtpAction = action.needsAuth().action(async () => {
  const { ok, data } = await get('/auth/enable-otp');

  if (!ok)
    throw new Error(
      Array.isArray(data.message) && data.message.length > 0
        ? (data.message[0] as string)
        : (data.message as string),
    );

  return { message: 'OTP action initiated successfully' };
});

export const enableOtpActionConfirm = action
  .needsAuth()
  .inputDto(EnableOtpDto)
  .outputDto(EnableOtpResponseDto)
  .action(async ({ parsedInput }) => {
    const { ok, data } = await post<EnableOtpResponseDto>(
      '/auth/enable-otp',
      parsedInput,
    );

    if (!ok)
      throw new Error(
        Array.isArray(data.message) && data.message.length > 0
          ? (data.message[0] as string)
          : (data.message as string),
      );

    revalidatePath('/app/settings/security', 'layout');

    return { message: data.message };
  });
