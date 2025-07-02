'use server';

import { get, post } from '@/lib/fetch';
import { EnableOtpDto } from '@repo/db/dto/auth/enable-otp.dto';
import { revalidatePath } from 'next/cache';

export async function enableOtpAction() {
  const response = await get('/auth/enable-otp');

  if (!response.ok) {
    const errorData = await response.json();
    if ('message' in errorData)
      return { success: false, error: errorData.message as string };
    else return { success: false };
  }

  return { success: true };
}

export async function enableOtpActionConfirm(data: EnableOtpDto) {
  const response = await post('/auth/enable-otp', data);

  if (!response.ok) {
    return { success: false };
  }

  revalidatePath('/app/settings/security', 'layout');

  return { success: true };
}
