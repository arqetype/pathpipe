import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { get } from '@/lib/fetch';
import { User } from '@repo/db/entities/user';

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth-token');

  if (!authCookie) {
    return redirect('/app/sign-in');
  }

  try {
    const response = await get('/auth/me');

    if (!response.ok) {
      console.error('Response not OK:', response.status, response.statusText);
      return redirect('/app/sign-in');
    }

    const user: User = await response.json();

    return user;
  } catch (error: unknown) {
    console.error(error);
    return redirect('/app/sign-in');
  }
});
