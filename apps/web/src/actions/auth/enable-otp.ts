'use server';

import { get, post } from '@/lib/fetch';
import { EnableOtpDto } from '@repo/db/dto/auth/enable-otp.dto';
import { revalidatePath } from 'next/cache';

export async function enableOtpAction() {
  const { ok, data } = await get('/auth/enable-otp');

  if (!ok) {
    const errorData = data;
    if ('message' in errorData)
      return { success: false, error: errorData.message };
    else return { success: false };
  }

  return { success: true };
}

export async function enableOtpActionConfirm(enableOtpDto: EnableOtpDto) {
  const { ok } = await post('/auth/enable-otp', enableOtpDto);

  if (!ok) return { success: false };

  revalidatePath('/app/settings/security', 'layout');

  return { success: true };
}
