'use server';

import { revalidatePath } from 'next/cache';
import { CsvImportResult } from '@repo/db/dto/company/csv-import-result.dto';
import { postForm } from '@/lib/fetch';

interface ImportResult {
  success: boolean;
  data?: CsvImportResult;
  error?: string;
}

export const importCsvAction = async (
  formData: FormData,
): Promise<ImportResult> => {
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return { success: false, error: 'No file provided' };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File size exceeds 10MB limit' };
  }

  if (
    !file.name.endsWith('.csv') &&
    file.type !== 'text/csv' &&
    file.type !== 'application/vnd.ms-excel'
  ) {
    return { success: false, error: 'Only CSV files are supported' };
  }

  const body = new FormData();
  body.append('file', file);

  const result = await postForm<CsvImportResult>('/companies/import', body);

  if (!result.ok) {
    return {
      success: false,
      error: (result.data.message as string) || 'Import failed',
    };
  }

  revalidatePath('/app/companies');

  return { success: true, data: result.data };
};
