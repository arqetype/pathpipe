'use client';

import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { Button } from '@repo/ui/components/button';
import { CardContent, CardFooter } from '@repo/ui/components/card';
import { Controller } from 'react-hook-form';
import {
  Field,
  FieldLabel,
  FieldError,
  FieldContent,
} from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { Checkbox } from '@repo/ui/components/checkbox';
import { RiLoader5Line, RiMailLine } from '@remixicon/react';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { SignUpDto } from '@repo/db/dto/auth/sign-up.dto';
import Link from 'next/link';
import { signUpAction } from '@/actions/auth/sign-up';
import { useState } from 'react';
import { resendEmailAction } from '@/actions/auth/resend-email';
import { AuthVerificationAlert } from '@repo/ui/components/customs/auth-verification-alert';
import { AuthVerificationError } from '@repo/ui/components/customs/auth-verification-error';

const resolver = classValidatorResolver(SignUpDto);

export function SignUpForm() {
  const [isPending, startTransition] = useTransition();
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  const form = useForm<SignUpDto>({
    resolver,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  const handleSubmit = async (data: SignUpDto) => {
    startTransition(async () => {
      const response = await signUpAction({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        terms: data.terms,
      });

      if (response.success) {
        setIsVerificationSent(true);
      } else {
        form.setError('email', {
          type: 'manual',
          message: response.message,
        });
      }
    });
  };

  const [resendStatus, setResendStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  const handleResendVerification = () => {
    setResendStatus({});
    startTransition(async () => {
      try {
        const email = form.getValues('email');
        const response = await resendEmailAction({ email });

        if (response.success) {
          setResendStatus({
            success: true,
            message: 'Verification email has been resent successfully.',
          });
        } else {
          setResendStatus({
            success: false,
            message: response.message || 'Failed to resend verification email.',
          });
        }
      } catch {
        setResendStatus({
          success: false,
          message:
            'An unexpected error occurred while sending the verification email.',
        });
      }
    });
  };

  return (
    <>
      <div className="mb-4 mt-3 px-4 w-full">
        <div className="bg-muted w-full flex rounded-lg items-center justify-between p-1 gap-2">
          <Link href="/app/sign-in" className="flex-1">
            <Button variant="ghost" className="w-full">
              Sign In
            </Button>
          </Link>
          <Button variant="outline" className="flex-1 cursor-default">
            Sign Up
          </Button>
        </div>
      </div>

      {isVerificationSent ? (
        <>
          <CardContent className="space-y-4">
            <AuthVerificationAlert
              icon={RiMailLine}
              title="Email Verification Required"
              description={
                <>
                  We&apos;ve sent a verification email to
                  <span className="font-medium">
                    {' '}
                    {form.getValues('email')}
                  </span>
                  . Please check your inbox and click the verification link to
                  activate your account.
                </>
              }
            />
            {resendStatus.message && (
              <AuthVerificationError
                success={resendStatus.success}
                message={resendStatus.message}
              />
            )}
          </CardContent>
          <CardFooter className="bg-transparent border-none">
            <Button
              variant="outline"
              className="w-full"
              disabled={isPending}
              onClick={handleResendVerification}
            >
              {isPending ? (
                <>
                  <RiLoader5Line className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
          </CardFooter>
        </>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <CardContent className="space-y-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="John Doe"
                    disabled={isPending}
                    autoComplete="name"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="name@example.com"
                    disabled={isPending}
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    </div>
                  </FieldContent>
                  <Input
                    type="password"
                    {...field}
                    id={field.name}
                    disabled={isPending}
                    autoComplete="password"
                    placeholder="••••••••••••••••"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name}>
                        Confirm Password
                      </FieldLabel>
                    </div>
                  </FieldContent>
                  <Input
                    type="password"
                    {...field}
                    id={field.name}
                    disabled={isPending}
                    autoComplete="confirm-password"
                    placeholder="••••••••••••••••"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="terms"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  orientation="horizontal"
                  data-invalid={fieldState.invalid}
                >
                  <Checkbox
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={(checked: boolean) => {
                      return field.onChange(checked);
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldLabel
                    htmlFor={field.name}
                    className="text-sm font-normal"
                  >
                    I accept the{' '}
                    <Link href="" className="text-primary underline">
                      terms and conditions
                    </Link>
                  </FieldLabel>
                </Field>
              )}
            />
          </CardContent>

          <CardFooter className="space-y-4 flex-col bg-transparent border-none">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <RiLoader5Line className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>
          </CardFooter>
        </form>
      )}
    </>
  );
}
