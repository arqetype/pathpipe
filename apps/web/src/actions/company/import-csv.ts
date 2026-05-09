'use server';

import { revalidatePath } from 'next/cache';
import { CsvImportResult } from '@repo/db/dto/company/csv-import-result.dto';

interface ImportResult {
  success: boolean;
  data?: CsvImportResult;
  error?: string;
}

async function fetchWithFile(
  url: string,
  file: File,
): Promise<{ ok: true; data: CsvImportResult } | { ok: false; error: string }> {
  const cookieStore = await import('next/headers').then((m) => m.cookies());
  const authToken = cookieStore.get('auth-token');
  const cookieHeader = authToken ? `auth-token=${authToken.value}` : undefined;

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    method: 'POST',
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: formData,
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      error: json.message || json.error || 'Import failed',
    };
  }

  return {
    ok: true,
    data: json as CsvImportResult,
  };
}

export const importCsvAction = async (
  _previousState: unknown,
  formData: FormData,
): Promise<ImportResult> => {
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return {
      success: false,
      error: 'No file provided',
    };
  }

  // Validate file size (10MB limit)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      success: false,
      error: 'File size exceeds 10MB limit',
    };
  }

  // Validate file type
  if (
    !file.name.endsWith('.csv') &&
    file.type !== 'text/csv' &&
    file.type !== 'application/vnd.ms-excel'
  ) {
    return {
      success: false,
      error: 'Only CSV files are supported',
    };
  }

  const result = await fetchWithFile('/companies/import', file);

  if (!result.ok) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath('/app/companies');

  return {
    success: true,
    data: result.data,
  };
};
