import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { get } from '@/lib/fetch';

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth-token');

  if (!authCookie) {
    return null;
  }

  try {
    const response = await get('auth/me');

    if (!response.ok) {
      return redirect('/app/sign-in');
    }

    const user = await response.json();

    return user;
  } catch {
    return redirect('/app/sign-in');
  }
});
