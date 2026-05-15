'use server';

import { patch } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { UpdateCompanyDto } from '@repo/db/dto/company/update-company.dto';
import { Company } from '@repo/db/entities/company';
import { revalidatePath } from 'next/cache';

export const updateCompanyAction = action
  .inputDto(UpdateCompanyDto)
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;

    const { ok, data: company } = await patch<Company>(
      `/companies/${id}`,
      data,
    );

    if (!ok) throw new Error('Failed to update company');

    revalidatePath('/app/companies');

    return company;
  });
