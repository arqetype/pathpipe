import { NextRequest } from 'next/server';
import { getRaw } from '@/lib/fetch';

const FORWARDED_HEADERS = [
  'Content-Type',
  'Content-Length',
  'Content-Disposition',
  'Cache-Control',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const download = request.nextUrl.searchParams.has('download')
    ? '?download'
    : '';

  // Encoded: blocks path traversal
  const file = await getRaw(
    `/files/${encodeURIComponent(id)}/download${download}`,
  );
  if (!file) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = file.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(file.body, { headers });
}
