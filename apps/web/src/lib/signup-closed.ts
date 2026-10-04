import { connection } from 'next/server';

export async function isSignupClosed(): Promise<boolean> {
  // Runtime read, never prerendered
  await connection();
  return process.env.SIGNUP_CLOSED === 'true';
}
