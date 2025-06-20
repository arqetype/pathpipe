import { cookies } from 'next/headers';
import { cache } from 'react';

export const get = cache(async (path: string) => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) headers['Cookie'] = `auth-token=${authToken.value}`;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers,
    credentials: 'include',
  });

  return res;
});
