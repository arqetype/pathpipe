import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { get } from '@/lib/fetch';
import { User } from '@repo/db/entities/user';

export const handleAuthenticationRedirection = cache(async () => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token');

  if (!authToken) {
    return { isAuthenticated: false, redirectTo: '/app/sign-in', user: null };
  }

  try {
    const { ok, data } = await get<User>('/user/me');

    if (!ok) {
      return { isAuthenticated: false, redirectTo: '/app/sign-in', user: null };
    }

    return { isAuthenticated: true, redirectTo: '/app', user: data };
  } catch {
    return { isAuthenticated: false, redirectTo: '/app/sign-in', user: null };
  }
});

export const getCurrentUser = cache(async () => {
  const { isAuthenticated, redirectTo, user } =
    await handleAuthenticationRedirection();

  if (!isAuthenticated || !user) {
    redirect(redirectTo);
  }

  return user;
});

export const getCurrentUserOrNull = cache(async () => {
  const { user } = await handleAuthenticationRedirection();

  return user;
});
