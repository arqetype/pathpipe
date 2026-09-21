import { BadRequestException } from '@nestjs/common';

const SUPPORTED = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  txt: ['text/plain', 'text/markdown', 'application/octet-stream'],
} as const;

export const RESUME_MAX_BYTES = 8 * 1024 * 1024;

type Kind = keyof typeof SUPPORTED;

// Extension wins over MIME type.
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

// ESM-only: must stay dynamic.
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

// In memory only: never stored.
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
