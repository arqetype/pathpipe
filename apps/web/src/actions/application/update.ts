'use server';

import { patch } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { UpdateCandidateDto } from '@repo/db/dto/candidate/update-candidate.dto';
import { Candidate } from '@repo/db/entities/candidate';
import { revalidatePath } from 'next/cache';

export const updateApplicationAction = action
  .inputDto(UpdateCandidateDto)
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;

    const { ok } = await patch<Candidate>(`/applications/${id}`, data);

    if (!ok) throw new Error('Failed to update candidate');

    revalidatePath('/app/applications');
  });
