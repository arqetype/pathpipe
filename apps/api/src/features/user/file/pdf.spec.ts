import { BadRequestException } from '@nestjs/common';
import {
  assertPdf,
  compressPdf,
  decompressPdf,
  downloadFilename,
  PDF_MAX_BYTES,
} from './pdf';

const upload = (buffer: Buffer, originalname = 'cv.pdf') => ({
  buffer,
  originalname,
  size: buffer.length,
});

const pdf = (body = 'x'.repeat(5000)) => Buffer.from(`%PDF-1.7\n${body}`);

describe('assertPdf', () => {
  it('accepts a file whose bytes start with the PDF magic', () => {
    expect(() => assertPdf(upload(pdf()))).not.toThrow();
  });

  it('rejects a non-PDF even when it is named and typed as one', () => {
    const docx = Buffer.from('PK\u0003\u0004 and the rest of a .docx');
    expect(() => assertPdf(upload(docx, 'definitely-a-cv.pdf'))).toThrow(
      BadRequestException,
    );
  });

  it('rejects an empty file', () => {
    expect(() => assertPdf(upload(Buffer.alloc(0)))).toThrow(
      BadRequestException,
    );
  });

  it('rejects anything over the size limit', () => {
    const big = { ...upload(pdf()), size: PDF_MAX_BYTES + 1 };
    expect(() => assertPdf(big)).toThrow(BadRequestException);
  });
});

describe('compressPdf', () => {
  it('round-trips the exact bytes', async () => {
    const original = pdf();
    const stored = await compressPdf(original);
    expect(await decompressPdf(stored)).toEqual(original);
  });

  it('stores less than it was given', async () => {
    const original = pdf();
    expect((await compressPdf(original)).length).toBeLessThan(original.length);
  });
});

describe('downloadFilename', () => {
  it('strips what would break the header and keeps the extension', () => {
    // Spaces legal in quoted header
    expect(downloadFilename('cv"; x=\ny.pdf')).toBe('cv_ x_y.pdf');
  });

  it('adds the extension when the stored name lost it', () => {
    expect(downloadFilename('diploma')).toBe('diploma.pdf');
  });
});
