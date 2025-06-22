'use server';

type SignUpResponse = {
  success: boolean;
  message: string;
};

export default async function signUpAction(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): Promise<SignUpResponse> {
  try {
    const apiUrl = new URL('/auth/sign-up', process.env.NEXT_PUBLIC_API_URL);

    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });

    const parsed = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          response.status === 401
            ? 'message' in parsed
              ? parsed.message
              : 'Invalid email address'
            : parsed.message || 'An error occurred while signing up',
      };
    }

    return { success: true, message: 'Sign up successful' };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
