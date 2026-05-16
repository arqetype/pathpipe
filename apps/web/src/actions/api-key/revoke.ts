'use server';

import { del } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { RevokeAPIKeyDto } from '@repo/db/dto/api-key/revoke-api-key.dto';
import { revalidatePath } from 'next/cache';

interface RevokeApiKeyResult {
  id: string;
}

export const revokeApiKeyAction = action
  .inputDto(RevokeAPIKeyDto)
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { ok } = await del<RevokeApiKeyResult>(
      `/auth/api-keys/${parsedInput.id}/revoke`,
      {},
    );

    if (!ok) throw new Error('Failed to revoke api key');

    revalidatePath('/app/api-keys');
  });
