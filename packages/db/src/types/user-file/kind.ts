/**
 * What a stored file is, so the picker on an application can offer the right
 * ones.
 *
 * A diploma and a CV are both PDFs a user keeps forever; only one of them
 * belongs in the "resume" slot of an application. The kind is what separates
 * them, and it is set at upload because the filename never reliably says.
 */
export enum UserFileKind {
  RESUME = 'RESUME',
  COVER_LETTER = 'COVER_LETTER',
  DIPLOMA = 'DIPLOMA',
  CERTIFICATE = 'CERTIFICATE',
}
