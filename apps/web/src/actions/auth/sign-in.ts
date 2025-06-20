'use server';

import { cookies } from 'next/headers';

type SignInResponse = {
  success: boolean;
  message: string;
};

const AUTH_COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export default async function signInAction(
  email: string,
  password: string,
): Promise<SignInResponse> {
  try {
    const apiUrl = new URL('auth/sign-in', process.env.NEXT_PUBLIC_API_URL);

    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return {
        success: false,
        message:
          response.status === 401
            ? 'Unauthorized'
            : `Error: ${response.statusText}`,
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
    });

    return { success: true, message: 'Sign-in successful' };
  } catch (error) {
    console.error('Sign-in error:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
