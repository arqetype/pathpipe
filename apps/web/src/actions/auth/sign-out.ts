'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  redirect('/app/sign-in');
}
