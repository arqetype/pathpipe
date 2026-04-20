'use server';

import { patch } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { Candidate } from '@repo/db/entities/candidate';
import { UpdateCandidateStageDto } from '@repo/db/dto/candidate/update-candidate-stage.dto';
import { revalidatePath } from 'next/cache';

export const updateApplicationStatusAction = action
  .inputDto(UpdateCandidateStageDto)
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { id, stage } = parsedInput;

    const { ok, data } = await patch<Candidate>(`/applications/${id}/status`, {
      status: stage,
    });

    if (!ok) {
      throw new Error('Failed to update candidate stage');
    }

    revalidatePath('/app/applications');

    return data;
  });
