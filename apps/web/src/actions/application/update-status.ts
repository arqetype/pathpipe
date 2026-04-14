'use server';

import { patch } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { Application } from '@repo/db/entities/application';
import { UpdateApplicationStatusDto } from '@repo/db/dto/application/update-application-status.dto';
import { revalidatePath } from 'next/cache';

export const updateApplicationStatusAction = action
  .inputDto(UpdateApplicationStatusDto)
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { id, status } = parsedInput;

    const { ok, data } = await patch<Application>(
      `/applications/${id}/status`,
      { status },
    );

    if (!ok) {
      throw new Error('Failed to update application status');
    }

    revalidatePath('/app/applications');

    return data;
  });
