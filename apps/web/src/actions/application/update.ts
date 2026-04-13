'use server';

import { patch } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { Application } from '@repo/db/entities/application';
import { revalidatePath } from 'next/cache';

export const updateApplicationAction = action
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput as {
      id: string;
    } & Partial<Application>;

    const { ok } = await patch<Application>(`/applications/${id}`, data);

    if (!ok) throw new Error('Failed to update application');

    revalidatePath('/app');
  });
