import { fetchDocumentsAction } from '@/actions/user-file';
import { DocumentLibrary } from '@/components/features/documents/library';

/**
 * Everything the job search needs to hand over, on one page.
 *
 * One request rather than four: the whole library of one user is a few dozen
 * rows of metadata, and splitting it by kind happens in the browser.
 */
export default async function DocumentsPage() {
  const files = await fetchDocumentsAction();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4">
      <div>
        <h1 className="text-lg font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Your CVs, cover letters, diplomas and certificates, stored as
          compressed PDFs. Attach one to an application from the application
          itself.
        </p>
      </div>

      <DocumentLibrary files={files} />
    </div>
  );
}
