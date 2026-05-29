'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { action } from '@/lib/safe-action';

// export default async function signOutAction() {
//   const cookieStore = await cookies();
//   cookieStore.delete('auth-token');
//   redirect('/app/sign-in');
// }

export const signOutAction = action.action(async () => {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  redirect('/app/sign-in');
});
