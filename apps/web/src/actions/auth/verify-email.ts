'use server';

import { UUID } from 'crypto';

type VerifyEmailResponse = {
  success: boolean;
  message: string;
};

export default async function verifyEmailAction(
  token: UUID,
): Promise<VerifyEmailResponse> {
  try {
    const apiUrl = new URL(
      '/auth/verify-email',
      process.env.NEXT_PUBLIC_API_URL,
    );

    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const parsed = await response.json();
    console.log('Email verification response:', parsed);

    if (!response.ok) {
      return {
        success: false,
        message:
          response.status === 401
            ? 'message' in parsed
              ? parsed.message
              : 'Invalid token'
            : parsed.message || 'An error occurred while verifying email',
      };
    }

    return { success: true, message: 'Email verification successful' };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
