import { cookies } from 'next/headers';
import { cache } from 'react';

const fetchWithAuth = cache(
  async (path: string, options: RequestInit = {}): Promise<Response> => {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (authToken) {
      headers['Cookie'] = `auth-token=${authToken.value}`;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    return res;
  },
);

export const get = cache(async (path: string) => {
  return fetchWithAuth(path);
});

export const post = cache(async (path: string, body: unknown) => {
  return fetchWithAuth(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
});

export const put = cache(async (path: string, body: unknown) => {
  return fetchWithAuth(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
});

export const del = cache(async (path: string, body: unknown) => {
  return fetchWithAuth(path, {
    method: 'DELETE',
    body: JSON.stringify(body),
  });
});

export const patch = cache(async (path: string, body: unknown) => {
  return fetchWithAuth(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
});
