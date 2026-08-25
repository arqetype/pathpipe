'use server';

import { patch } from '@/lib/fetch';
import { revalidatePath } from 'next/cache';

export interface UpdateWatchInput {
  careersUrl?: string | null;
  website?: string | null;
  notes?: string | null;
}

export async function updateWatchAction(
  id: string,
  data: UpdateWatchInput,
): Promise<{ success: boolean }> {
  const { ok } = await patch<{ success: boolean }>(
    `/companies/${id}/watch`,
    data,
  );

  if (!ok) return { success: false };

  revalidatePath('/app/watchlist');
  return { success: true };
}
