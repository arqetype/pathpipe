import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  const proto =
    request.headers.get('x-forwarded-proto') ??
    new URL(request.url).protocol.replace(':', '');
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const base = `${proto}://${host}`;

  if (!token) {
    return NextResponse.redirect(
      new URL('/app/sign-in?error=google_auth_failed', base),
    );
  }

  const response = NextResponse.redirect(new URL('/app', base));

  response.cookies.set('auth-token', token, {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
