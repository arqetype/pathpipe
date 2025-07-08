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
    const { ok, data } = await get<User>('/user/me');

    if (!ok) {
      return redirect('/app/sign-in');
    }

    return data;
  } catch {
    return redirect('/app/sign-in');
  }
});

export const getCurrentUserOrNull = cache(async () => {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth-token');

  if (!authCookie) {
    return null;
  }

  try {
    const { ok, data } = await get<User>('/user/me');

    if (!ok) {
      return null;
    }

    const user: User = data;

    return user;
  } catch {
    return null;
  }
});
