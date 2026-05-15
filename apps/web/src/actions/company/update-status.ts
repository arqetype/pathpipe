'use server';

import { patch } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { UpdateCompanyStatusDto } from '@repo/db/dto/company/update-company-status.dto';
import { Company } from '@repo/db/entities/company';
import { revalidatePath } from 'next/cache';

export const updateCompanyStatusAction = action
  .inputDto(UpdateCompanyStatusDto)
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { id, status } = parsedInput;

    const { ok, data } = await patch<Company>(`/companies/${id}/status`, {
      status,
    });

    if (!ok) throw new Error('Failed to update company status');

    revalidatePath('/app/companies');

    return data;
  });
