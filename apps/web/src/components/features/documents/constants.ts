import { UserFileKind } from '@repo/db/types/user-file/kind';

export const DOCUMENT_KINDS = [
  {
    kind: UserFileKind.RESUME,
    label: 'CVs',
    singular: 'CV',
    article: 'a CV',
  },
  {
    kind: UserFileKind.COVER_LETTER,
    label: 'Cover letters',
    singular: 'cover letter',
    article: 'a cover letter',
  },
  {
    kind: UserFileKind.DIPLOMA,
    label: 'Diplomas',
    singular: 'diploma',
    article: 'a diploma',
  },
  {
    kind: UserFileKind.CERTIFICATE,
    label: 'Certificates',
    singular: 'certificate',
    article: 'a certificate',
  },
] as const;

export const kindMeta = (kind: UserFileKind) =>
  DOCUMENT_KINDS.find((entry) => entry.kind === kind) ?? DOCUMENT_KINDS[0];

export const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
