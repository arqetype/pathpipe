import { BadRequestException } from '@nestjs/common';
import { gunzip, gzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const PDF_MAX_BYTES = 10 * 1024 * 1024;

// PDF magic bytes
const MAGIC = Buffer.from('%PDF-');

// Sniff bytes, never mimetype
export const assertPdf = (file: {
  buffer: Buffer;
  originalname: string;
  size: number;
}): void => {
  if (!file.buffer?.length)
    throw new BadRequestException('That file is empty.');
  if (file.size > PDF_MAX_BYTES) {
    throw new BadRequestException('Keep the file under 10 MB.');
  }
  if (!file.buffer.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new BadRequestException(
      'Only PDF files can be stored — export or print your document to PDF first.',
    );
  }
};

// ponytail: gzip, not ghostscript
export const compressPdf = (pdf: Buffer): Promise<Buffer> =>
  gzipAsync(pdf, { level: 9 });

export const decompressPdf = (stored: Buffer): Promise<Buffer> =>
  gunzipAsync(stored);

// Strips header-injection characters
export const downloadFilename = (filename: string): string => {
  const base = (filename || 'document').replace(/[^\w.\- ]+/g, '_').slice(-100);
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
};
