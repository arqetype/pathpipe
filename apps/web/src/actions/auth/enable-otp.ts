'use server';

import { get, post } from '@/lib/fetch';
import { EnableOtpDto } from '@repo/db/dto/auth/enable-otp.dto';

export async function enableOtpAction() {
  const response = await get('/auth/enable-otp');

  if (!response.ok) {
    return { success: false };
  }

  return { success: true };
}

export async function enableOtpActionConfirm(data: EnableOtpDto) {
  const response = await post('/auth/enable-otp', data);

  if (!response.ok) {
    return { success: false };
  }

  return { success: true };
}
