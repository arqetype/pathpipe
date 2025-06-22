'use client';

import { CardContent, CardFooter } from '@repo/ui/components/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@repo/ui/components/input-otp';
import { Input } from '@repo/ui/components/input';
import { SignInDto } from '@repo/db/dto/sign-in.dto';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm } from 'react-hook-form';
import { useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@repo/ui/components/button';
import { Loader2Icon, ShieldCheckIcon, MailIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import signInAction from '@/actions/auth/sign-in';
import resendEmailAction from '@/actions/auth/resend-email';
import { useState } from 'react';

export function SignInForm() {
  const [isPending, startTransition] = useTransition();
  const [showOtp, setShowOtp] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});
  const [otpStatus, setOtpStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  const form = useForm<SignInDto>({
    resolver: classValidatorResolver(SignInDto),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmit = async (data: SignInDto) => {
    startTransition(async () => {
      let response;
      if (!showOtp && !showEmailVerification) {
        response = await signInAction(data.email, data.password);
        if (response.success && !response.code) {
          redirect('/app/');
        } else if (response.code === 'otp_required') {
          setShowOtp(true);
        } else if (
          response.code === 'email_not_verified' ||
          response.code === 'email_verification_cooldown'
        ) {
          setShowEmailVerification(true);
          if (response.code === 'email_verification_cooldown') {
            setResendStatus({
              success: false,
              message:
                'Please wait before requesting another verification email.',
            });
          }
        } else {
          form.setError('email', {
            type: 'manual',
            message: response.message,
          });
        }
      } else if (showOtp) {
        response = await signInAction(data.email, data.password, data.otp);
        if (response.success) redirect('/app/');
        else {
          form.setError('otp', {
            type: 'manual',
            message: response.message,
          });
        }
      }
    });
  };

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
          <Button
            variant="outline"
            className="flex-1 hover:bg-[var(--background)] cursor-default"
          >
            Sign In
          </Button>
          <Link href="/app/sign-up" className="flex-1">
            <Button variant="ghost" className="w-full">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <CardContent className="space-y-4">
          {showEmailVerification ? (
            <div className="px-1">
              <div className="rounded-lg border p-4 mb-4 bg-muted/50">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <MailIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">
                      Email Verification Required
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We&apos;ve sent a verification email to
                      <span className="font-medium">
                        {' '}
                        {form.getValues('email')}
                      </span>
                      . Please check your inbox and click the verification link
                      to activate your account.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {resendStatus.message && (
                  <div
                    className={`p-3 rounded-md text-sm ${
                      resendStatus.success
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}
                  >
                    {resendStatus.message}
                  </div>
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
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowEmailVerification(false)}
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          ) : !showOtp ? (
            <>
              <FormField
                key={'email'}
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
                key={'password'}
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="/app/forgot-password"
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
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
            </>
          ) : (
            <>
              <div className="rounded-lg border p-4 mb-4 bg-muted/50">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <ShieldCheckIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">
                      Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      For added security, please enter the 6-digit code sent to
                      <span className="font-medium">
                        {' '}
                        {form.getValues('email')}.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                key={'otp'}
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enter verification code</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        {...field}
                        className="w-full gap-2"
                      >
                        <InputOTPGroup className="w-full">
                          <InputOTPSlot
                            index={0}
                            className="w-[15%] md:w-[20%] h-12 text-2xl"
                          />
                          <InputOTPSlot
                            index={1}
                            className="w-[15%] md:w-[20%] h-12 text-2xl"
                          />
                          <InputOTPSlot
                            index={2}
                            className="w-[15%] md:w-[20%] h-12 text-2xl"
                          />
                          <InputOTPSlot
                            index={3}
                            className="w-[15%] md:w-[20%] h-12 text-2xl"
                          />
                          <InputOTPSlot
                            index={4}
                            className="w-[15%] md:w-[20%] h-12 text-2xl"
                          />
                          <InputOTPSlot
                            index={5}
                            className="w-[15%] md:w-[20%] h-12 text-2xl"
                          />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />

                    {otpStatus.message && (
                      <div
                        className={`p-3 rounded-md text-sm mt-3 mb-2 ${
                          otpStatus.success
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        }`}
                      >
                        {otpStatus.message}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mt-2">
                      Didn&apos;t receive a code?{' '}
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm"
                        type="button"
                        onClick={() => {
                          setOtpStatus({});
                          startTransition(async () => {
                            try {
                              const response = await signInAction(
                                form.getValues('email'),
                                form.getValues('password'),
                              );

                              console.log(response);

                              if (response.code === 'otp_required') {
                                setOtpStatus({
                                  success: true,
                                  message:
                                    'A new verification code has been sent.',
                                });
                              } else if (response.code === 'otp_cooldown') {
                                setOtpStatus({
                                  success: false,
                                  message:
                                    response.message ||
                                    'Please wait before requesting another code.',
                                });
                              } else {
                                setOtpStatus({
                                  success: false,
                                  message:
                                    response.message ||
                                    'Failed to resend verification code.',
                                });
                              }
                            } catch {
                              setOtpStatus({
                                success: false,
                                message: 'An error occurred. Please try again.',
                              });
                            }
                          });
                        }}
                      >
                        Resend code
                      </Button>
                    </p>
                  </FormItem>
                )}
              />
            </>
          )}
        </CardContent>
        {!showEmailVerification && (
          <CardFooter className="space-y-4 flex-col">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {showOtp ? 'Verifying code...' : 'Sign in'}
                </>
              ) : showOtp ? (
                'Verify'
              ) : (
                'Sign in'
              )}
            </Button>
          </CardFooter>
        )}
      </form>
    </Form>
  );
}
