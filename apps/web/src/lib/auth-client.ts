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
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    return { success: false, error: 'Invalid email or password' };
  }

  const result: { access_token: string } = await response.json();
  return {
    success: true,
    access_token: result.access_token,
  };
};

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth-token');
  const headers = {
    ...options.headers,
    ContentType: 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };

  return fetch(url, { ...options, headers });
}
