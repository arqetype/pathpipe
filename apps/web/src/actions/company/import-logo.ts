'use server';

import { postForm } from '@/lib/fetch';

interface ImportResult {
  success: boolean;
  updated_at?: string;
  error?: string;
}

export const importCompanyLogoAction = async (
  formData: FormData,
  id: string,
): Promise<ImportResult> => {
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return { success: false, error: 'No file provided' };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File size exceeds 10MB limit' };
  }

  if (
    !file.name.endsWith('.png') &&
    file.type !== 'image/png' &&
    file.type !== 'image/jpeg' &&
    file.type !== 'image/webp' &&
    file.type !== 'image/svg+xml'
  ) {
    return { success: false, error: 'Only images are supported' };
  }

  const body = new FormData();
  body.append('file', file);

  const result = await postForm<{ success: boolean; updated_at: string }>(
    `/companies/${id}/logo`,
    body,
  );

  if (!result.ok) {
    return {
      success: false,
      error: (result.data.message as string) || 'Import failed',
    };
  }

  return { success: true, updated_at: result.data.updated_at };
};
