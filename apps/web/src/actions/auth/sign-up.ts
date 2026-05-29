'use server';

import { publicPost } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import { IsNotEmpty, IsString, IsEmail, IsBoolean } from 'class-validator';

class SignUpActionResponse {
  @IsString()
  @IsNotEmpty()
  message: string;
}

class SignUpActionInput {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @IsBoolean()
  terms: boolean;
}

export const signUpAction = action
  .inputDto(SignUpActionInput)
  .outputDto(SignUpActionResponse)
  .action(async ({ parsedInput }) => {
    const { ok, data } = await publicPost('/auth/sign-up', parsedInput);

    if (!ok) {
      const message = Array.isArray(data.message)
        ? (data.message[0] as string)
        : data.message || 'An error occurred while signing up';

      throw new Error(message);
    }

    return {
      message: 'Sign up successful. Please check your email for verification.',
    };
  });
