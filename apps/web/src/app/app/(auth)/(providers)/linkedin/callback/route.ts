import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  const base = process.env.APP_URL ?? new URL(request.url).origin;

  if (!token) {
    return NextResponse.redirect(
      new URL('/app/sign-in?error=linkedin_auth_failed', base),
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
