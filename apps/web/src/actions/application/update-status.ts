'use server';

import { patch } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { revalidatePath } from 'next/cache';

export const updateApplicationStatusAction = action
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { id, status } = parsedInput as {
      id: string;
      status: ApplicationStatus;
    };

    const { ok, data } = await patch<Application>(
      `/applications/${id}/status`,
      { status },
    );

    if (!ok) {
      throw new Error('Failed to update application status');
    }

    revalidatePath('/app');

    return data;
  });
