'use client';

import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { Button } from '@repo/ui/components/button';
import { CardContent, CardFooter } from '@repo/ui/components/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Loader2Icon, MailIcon } from 'lucide-react';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { SignUpDto } from '@repo/db/dto/auth/sign-up.dto';
import Link from 'next/link';
import signUpAction from '@/actions/auth/sign-up';
import { useState } from 'react';
import resendEmailAction from '@/actions/auth/resend-email';
import { AuthVerificationAlert } from '@repo/ui/components/auth-verification-alert';
import { AuthVerificationError } from '@repo/ui/components/auth-verification-error';

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
      const response = await signUpAction(
        data.name,
        data.email,
        data.password,
        data.confirmPassword,
        data.terms,
      );

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
        const response = await resendEmailAction(form.getValues('email'));

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
    <Form {...form}>
      <div className="mb-4 px-6 w-full">
        <div className="bg-muted text-muted-foreground w-full flex items-center justify-between rounded-lg p-1 gap-2">
          <Link href="/app/sign-in" className="flex-1">
            <Button variant="ghost" className="w-full">
              Sign In
            </Button>
          </Link>
          <Button
            variant="outline"
            className="flex-1 hover:bg-[var(--background)] cursor-default"
          >
            Sign Up
          </Button>
        </div>
      </div>

      {isVerificationSent ? (
        <div className="px-6">
          <AuthVerificationAlert
            icon={MailIcon}
            title="Email Verification Required"
            description={
              <>
                We&apos;ve sent a verification email to
                <span className="font-medium"> {form.getValues('email')}</span>.
                Please check your inbox and click the verification link to
                activate your account.
              </>
            }
          />
          <div className="space-y-3">
            {resendStatus.message && (
              <AuthVerificationError
                success={resendStatus.success}
                message={resendStatus.message}
              />
            )}

            <Button
              variant="outline"
              className="w-full"
              disabled={isPending}
              onClick={handleResendVerification}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      disabled={isPending}
                      autoComplete="name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@example.com"
                      {...field}
                      disabled={isPending}
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      disabled={isPending}
                      autoComplete="password"
                      placeholder="••••••••••••••••"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Confirm Password</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      disabled={isPending}
                      autoComplete="confirm-password"
                      placeholder="••••••••••••••••"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked: boolean) => {
                          return field.onChange(checked);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm">
                      I accept the{' '}
                      <Link href="" className="text-primary underline">
                        terms and conditions
                      </Link>
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="space-y-4 flex-col">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>
          </CardFooter>
        </form>
      )}
    </Form>
  );
}
