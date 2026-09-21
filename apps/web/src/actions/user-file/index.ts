'use server';

import { del, get, patch, postForm } from '@/lib/fetch';
import type { UserFileSummary } from '@repo/db/query/user-file';
import type { UserFileKind } from '@repo/db/types/user-file/kind';
import { revalidatePath } from 'next/cache';

function messageOf(data: { message?: string | string[] }, fallback: string) {
  const message = Array.isArray(data?.message)
    ? data.message[0]
    : data?.message;
  return message || fallback;
}

export async function fetchDocumentsAction(
  kind?: UserFileKind,
): Promise<UserFileSummary[]> {
  const result = await get<UserFileSummary[]>(
    kind ? `/files?kind=${kind}` : '/files',
  );
  if (!result.ok) return [];
  return result.data;
}

export async function uploadDocumentAction(
  formData: FormData,
): Promise<UserFileSummary> {
  const result = await postForm<UserFileSummary>('/files', formData);
  if (!result.ok)
    throw new Error(messageOf(result.data, 'Could not store that file'));
  revalidatePath('/app/documents');
  return result.data;
}

export async function renameDocumentAction(
  id: string,
  name: string,
): Promise<UserFileSummary> {
  const result = await patch<UserFileSummary>(`/files/${id}`, { name });
  if (!result.ok)
    throw new Error(messageOf(result.data, 'Could not rename that file'));
  revalidatePath('/app/documents');
  return result.data;
}

export async function deleteDocumentAction(id: string): Promise<void> {
  const result = await del(`/files/${id}`, {});
  if (!result.ok)
    throw new Error(messageOf(result.data, 'Could not delete that file'));
  revalidatePath('/app/documents');
}
