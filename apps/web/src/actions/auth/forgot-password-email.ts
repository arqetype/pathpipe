'use server';

type ForgotPasswordEmailResponse = {
  success: boolean;
  message: string;
};

export default async function forgotPasswordEmail(
  email: string,
): Promise<ForgotPasswordEmailResponse> {
  try {
    const apiUrl = new URL(
      '/auth/forgot-password',
      process.env.NEXT_PUBLIC_API_URL,
    );

    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'An error occurred while sending the email',
      };
    }

    return {
      success: true,
      message:
        'If you have an account, you will receive a password reset email shortly.',
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
