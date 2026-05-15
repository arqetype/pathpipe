'use server';

import { del } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { DeleteApplicationDto } from '@repo/db/dto/application/delete-application.dto';
import { revalidatePath } from 'next/cache';

export const deleteApplicationAction = action
  .inputDto(DeleteApplicationDto)
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { ok } = await del(`/applications/${parsedInput.id}`, {});

    if (!ok) throw new Error('Failed to delete application');

    revalidatePath('/app/applications');
  });
