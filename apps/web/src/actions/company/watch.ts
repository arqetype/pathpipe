'use server';

import { post } from '@/lib/fetch';
import { revalidatePath } from 'next/cache';

export async function watchCompanyAction(
  name: string,
): Promise<{ success: boolean }> {
  const { ok } = await post<{ success: boolean }>('/companies/watch', {
    name,
  });

  if (!ok) return { success: false };

  revalidatePath('/app/watchlist');
  return { success: true };
}
