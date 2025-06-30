'use server';

import { ResetPasswordUserResponseDto } from '@repo/db/dto/auth/reset-password-user.dto';

type ResetPasswordUserResponse = {
  user: ResetPasswordUserResponseDto | null;
};

export default async function resetPasswordUserAction(
  token: string,
): Promise<ResetPasswordUserResponse> {
  const apiUrl = new URL(
    '/auth/reset-password/user',
    process.env.NEXT_PUBLIC_API_URL,
  );

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    return { user: null };
  }

  const user = await response.json();

  return { user };
}
