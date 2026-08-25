'use server';

import { del } from '@/lib/fetch';
import { revalidatePath } from 'next/cache';

export async function unwatchCompanyAction(
  id: string,
): Promise<{ success: boolean }> {
  const { ok } = await del<{ success: boolean }>(`/companies/${id}/watch`, {});

  if (!ok) return { success: false };

  revalidatePath('/app/watchlist');
  return { success: true };
}
