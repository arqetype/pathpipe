'use server';

import { post } from '@/lib/fetch';
import { ApiKey } from '@repo/db/entities/api-key';
import { revalidatePath } from 'next/cache';

interface CreateApiKeyResult {
  success: boolean;
  data?: ApiKey;
  error?: string;
}

export async function createApiKeyAction(
  name: string,
): Promise<CreateApiKeyResult> {
  const result = await post<ApiKey>('/auth/api-keys', { name });

  if (!result.ok) {
    return { success: false, error: 'Failed to create API key' };
  }

  revalidatePath('/app/api-keys');

  return { success: true, data: result.data };
}
