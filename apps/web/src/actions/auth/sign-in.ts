'use server';

import { publicPost } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { cookies } from 'next/headers';

class SignInInput {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  otp?: string;
}

class SignInResponse {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  code?: string;
}

const AUTH_COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const signInAction = action
  .inputDto(SignInInput)
  .outputDto(SignInResponse)
  .action(async ({ parsedInput }) => {
    const { ok, response, data } = await publicPost(
      '/auth/sign-in',
      parsedInput,
    );

    if (!ok) {
      if (
        data.error === 'email_not_verified' ||
        data.error === 'email_verification_cooldown'
      ) {
        return {
          message:
            'Email not verified. Please verify your email before signing in.',
          code: data.error,
        };
      }

      if (data.error === 'otp_required') {
        return {
          message: 'OTP is required for this account',
          code: data.error,
        };
      }

      const message = Array.isArray(data.message)
        ? (data.message[0] as string)
        : data.message || 'An error occurred during sign-in';

      throw new Error(message);
    }

    const cookieHeader = response.headers.get('Set-Cookie');
    if (!cookieHeader) throw new Error('No cookie found in response');

    const cookieMatch = cookieHeader.match(/^([^=]+)=([^;]+)/);
    if (!cookieMatch || !cookieMatch[2])
      throw new Error('Invalid cookie format');

    const cookieStore = await cookies();
    cookieStore.set({
      name: AUTH_COOKIE_NAME,
      value: cookieMatch[2],
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      expires: new Date(Date.now() + COOKIE_MAX_AGE),
    });

    return {
      message: 'Sign-in successful',
    };
  });
