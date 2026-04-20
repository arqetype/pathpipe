'use server';

import { post } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { CreateCandidateDto } from '@repo/db/dto/candidate/create-candidate.dto';
import { IsEnum, IsString } from 'class-validator';
import { CandidateStage } from '@repo/db/types/candidate/stage';
import { revalidatePath } from 'next/cache';

class CreateCandidateResponse {
  @IsString()
  id: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(CandidateStage)
  stage: CandidateStage;
}

export const createApplicationAction = action
  .needsAuth()
  .inputDto(CreateCandidateDto)
  .outputDto(CreateCandidateResponse)
  .action(async ({ parsedInput }) => {
    const { ok, data } = await post<CreateCandidateResponse>(
      '/applications',
      parsedInput,
    );

    if (!ok) {
      throw new Error('Failed to create candidate');
    }

    revalidatePath('/app/applications');

    return data;
  });
