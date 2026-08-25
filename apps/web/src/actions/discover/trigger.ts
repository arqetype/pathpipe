'use server';

import { post } from '@/lib/fetch';

export async function triggerDiscoveryAction(): Promise<{ status: string }> {
  const result = await post<{ status: string }>('/admin/v1/discover', {});
  if (!result.ok) throw new Error('Failed to trigger discovery');
  return result.data;
}
