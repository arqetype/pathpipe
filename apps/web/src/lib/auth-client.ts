'use client';

import { SignInDto } from '@repo/db/dto/signIn.dto';

export const signInUser = async (data: SignInDto) => {
  const response = await fetch(
    process.env.NEXT_PUBLIC_API_URL + '/auth/sign-in',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    return { success: false };
  }

  return { success: true };
};
