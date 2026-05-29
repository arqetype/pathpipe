'use server';

import { get } from '@/lib/fetch';
import { ApiKey } from '@repo/db/entities/api-key';

interface FetchApiKeysResult {
  success: boolean;
  data?: ApiKey[];
  error?: string;
}

export async function fetchApiKeysAction(): Promise<FetchApiKeysResult> {
  const result = await get<ApiKey[]>('/auth/api-keys');

  if (!result.ok) {
    return { success: false, error: 'Failed to fetch API keys' };
  }

  return { success: true, data: result.data };
}
