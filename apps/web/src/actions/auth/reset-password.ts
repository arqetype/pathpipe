'use server';

type ResetPasswordResponse = {
  success: boolean;
  message: string;
};

export default async function resetPasswordAction(
  newPassword: string,
  confirmPassword: string,
  token: string,
): Promise<ResetPasswordResponse> {
  try {
    const apiUrl = new URL(
      '/auth/reset-password',
      process.env.NEXT_PUBLIC_API_URL,
    );

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword, confirmPassword, token }),
    });

    const parsed = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          parsed.message || 'An error occurred while resetting the password',
      };
    }

    return { success: true, message: 'Password reset successful' };
  } catch (error: unknown) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
