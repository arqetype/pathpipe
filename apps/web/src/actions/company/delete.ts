'use server';

import { del } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { DeleteCompanyDto } from '@repo/db/dto/company/delete-company.dto';
import { revalidatePath } from 'next/cache';

export const deleteCompanyAction = action
  .inputDto(DeleteCompanyDto)
  .needsAuth()
  .action(async ({ parsedInput }) => {
    const { ok } = await del(`/companies/${parsedInput.id}`, {});

    if (!ok) throw new Error('Failed to delete company');

    revalidatePath('/app/companies');
  });
