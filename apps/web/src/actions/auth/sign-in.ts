'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type SignInResponse = {
  success: boolean;
  message: string;
  code?: string;
};

const AUTH_COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export default async function signInAction(
  email: string,
  password: string,
  otp?: string,
): Promise<SignInResponse> {
  try {
    const apiUrl = new URL('/auth/sign-in', process.env.NEXT_PUBLIC_API_URL);

    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, otp }),
    });

    const parsed = await response.json();

    if (!response.ok) {
      if (
        parsed.error === 'email_not_verified' ||
        parsed.error === 'email_verification_cooldown'
      ) {
        redirect(
          `/app/verification/resend-email?email=${encodeURIComponent(email)}`,
        );
      }

      if (parsed.error === 'otp_required') {
        return {
          success: false,
          message: 'OTP is required for this account',
          code: 'otp_required',
        };
      }

      return {
        success: false,
        message:
          response.status === 401
            ? 'message' in parsed
              ? parsed.message
              : 'Invalid email or password'
            : parsed.message || 'An error occurred during sign-in',
      };
    }

    const cookieHeader = response.headers.get('Set-Cookie');
    if (!cookieHeader) {
      return { success: false, message: 'No cookie found in response' };
    }

    const cookieMatch = cookieHeader.match(/^([^=]+)=([^;]+)/);
    if (!cookieMatch || !cookieMatch[2]) {
      return { success: false, message: 'Invalid cookie format' };
    }

    const cookieStore = await cookies();
    cookieStore.set({
      name: AUTH_COOKIE_NAME,
      value: cookieMatch[2],
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      expires: new Date(Date.now() + COOKIE_MAX_AGE),
      path: '/',
      sameSite: 'lax',
    });

    return { success: true, message: 'Sign-in successful' };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error;
    }
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
