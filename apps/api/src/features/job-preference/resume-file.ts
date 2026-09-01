import { BadRequestException } from '@nestjs/common';

/**
 * Reading a CV out of the file somebody actually has.
 *
 * People keep their CV as a PDF or a Word document, not as text, and asking
 * them to paste it is asking them to do the conversion by hand — which is
 * exactly where the layout of a two-column CV turns into unreadable
 * interleaved lines. Doing it here means one implementation to fix when it gets
 * it wrong.
 *
 * Only the text is kept. The file itself is never written to disk or to the
 * database: it is read in memory, converted, and dropped.
 */

/** What the upload accepts, by extension and by declared type. */
const SUPPORTED = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  txt: ['text/plain', 'text/markdown', 'application/octet-stream'],
} as const;

export const RESUME_MAX_BYTES = 8 * 1024 * 1024;

export const RESUME_ACCEPT = '.pdf,.docx,.txt,.md';

type Kind = keyof typeof SUPPORTED;

/**
 * The extension wins over the declared MIME type.
 *
 * Browsers and operating systems disagree about the type of a `.docx` often
 * enough that trusting the header would reject files that parse perfectly.
 */
const kindOf = (filename: string, mimetype: string): Kind => {
  const extension = filename.toLowerCase().split('.').pop() ?? '';
  if (extension === 'pdf') return 'pdf';
  if (extension === 'docx') return 'docx';
  if (extension === 'txt' || extension === 'md') return 'txt';

  const declared = (Object.keys(SUPPORTED) as Kind[]).find((kind) =>
    (SUPPORTED[kind] as readonly string[]).includes(mimetype),
  );
  if (declared) return declared;

  throw new BadRequestException(
    'Upload a PDF, a Word document (.docx), or a text file.',
  );
};

/**
 * A PDF's text, page by page.
 *
 * `pdf-parse` is ESM-only from v2, and the API compiles to CommonJS, so it is
 * imported through a dynamic `import()` that survives the transpile rather than
 * a top-level `require` that would throw at boot.
 */
const readPdf = async (buffer: Buffer): Promise<string> => {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? '';
  } finally {
    await parser.destroy();
  }
};

const readDocx = async (buffer: Buffer): Promise<string> => {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
};

/**
 * The text of an uploaded CV.
 *
 * Throws rather than returning an empty string when nothing came out: a
 * scanned PDF with no text layer looks like a successful upload and then
 * silently matches nobody, which is worse than being told to paste the text.
 */
export const extractResumeFile = async (file: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}): Promise<string> => {
  if (!file.buffer?.length) {
    throw new BadRequestException('That file is empty.');
  }
  if (file.size > RESUME_MAX_BYTES) {
    throw new BadRequestException('Keep the file under 8 MB.');
  }

  const kind = kindOf(file.originalname ?? '', file.mimetype ?? '');

  let text: string;
  try {
    if (kind === 'pdf') text = await readPdf(file.buffer);
    else if (kind === 'docx') text = await readDocx(file.buffer);
    else text = file.buffer.toString('utf8');
  } catch {
    throw new BadRequestException(
      'We could not read that file. Try exporting it again, or paste the text.',
    );
  }

  const trimmed = text.trim();
  if (trimmed.length < 50) {
    throw new BadRequestException(
      'We found almost no text in that file — a scanned CV has to be pasted as text.',
    );
  }

  return trimmed;
};
