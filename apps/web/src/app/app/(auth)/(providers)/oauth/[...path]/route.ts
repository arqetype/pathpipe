import { NextRequest, NextResponse } from 'next/server';

// Never proxy other API routes
const OAUTH_PATHS = new Set([
  'google',
  'google/callback',
  'linkedin',
  'linkedin/callback',
]);

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join('/');
  if (!OAUTH_PATHS.has(path)) {
    return new Response('Not found', { status: 404 });
  }

  const base = process.env.APP_URL ?? request.nextUrl.origin;
  const apiResponse = await fetch(
    `${process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL}/auth/${path}${request.nextUrl.search}`,
    { redirect: 'manual' },
  );

  const location = apiResponse.headers.get('Location');
  if (!location) {
    const provider = path.split('/')[0];
    return NextResponse.redirect(
      new URL(`/app/sign-in?error=${provider}_auth_failed`, base),
    );
  }

  const response = NextResponse.redirect(location);

  const token = apiResponse.headers
    .getSetCookie()
    .map((cookie) => cookie.match(/^auth-token=([^;]+)/)?.[1])
    .find(Boolean);

  if (token) {
    response.cookies.set('auth-token', token, {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      expires: new Date(Date.now() + COOKIE_MAX_AGE),
      path: '/',
      sameSite: 'lax',
    });
  }

  return response;
}
