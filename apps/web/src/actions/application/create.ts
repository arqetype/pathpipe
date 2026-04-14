'use server';

import { post } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';
import { IsEnum, IsString } from 'class-validator';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { revalidatePath } from 'next/cache';

class CreateApplicationResponse {
  @IsString()
  id: string;

  @IsString()
  company: string;

  @IsString()
  position: string;

  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}

export const createApplicationAction = action
  .needsAuth()
  .inputDto(CreateApplicationDto)
  .outputDto(CreateApplicationResponse)
  .action(async ({ parsedInput }) => {
    const { ok, data } = await post<CreateApplicationResponse>(
      '/applications',
      parsedInput,
    );

    if (!ok) {
      throw new Error('Failed to create application');
    }

    revalidatePath('/app/applications');

    return data;
  });
