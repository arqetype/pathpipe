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
import { SignInDto } from '@repo/db/dto/auth/sign-in.dto';
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
import { AuthVerificationAlert } from '@repo/ui/components/auth-verification-alert';
import { AuthVerificationError } from '@repo/ui/components/auth-verification-error';
import forgotPasswordEmail from '@/actions/auth/forgot-password-email';

type StatusState = {
  success?: boolean;
  message?: string;
};

export function SignInForm() {
  const [isPending, startTransition] = useTransition();
  const [showOtp, setShowOtp] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [forgotPasswordPending, setForgotPasswordPending] = useState(false);

  const [resendStatus, setResendStatus] = useState<StatusState>({});
  const [otpStatus, setOtpStatus] = useState<StatusState>({});
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<StatusState>(
    {},
  );

  const form = useForm<SignInDto>({
    resolver: classValidatorResolver(SignInDto),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const isValidEmail = (email: string): boolean => {
    return Boolean(email && email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
  };

  const handleSignIn = async (data: SignInDto) => {
    const response = await signInAction(data.email, data.password);

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
          message: 'Please wait before requesting another verification email.',
        });
      }
    } else {
      form.setError('email', {
        type: 'manual',
        message: response.message,
      });
    }
  };

  const handleOtpSubmit = async (data: SignInDto) => {
    if (!data.otp || data.otp.length !== 6) {
      form.setError('otp', {
        type: 'manual',
        message: 'Please enter a valid 6-digit code',
      });
      return;
    }

    const response = await signInAction(data.email, data.password, data.otp);

    if (response.success) redirect('/app/');
    else {
      form.setError('otp', {
        type: 'manual',
        message: response.message,
      });
    }
  };

  const handleSubmit = async (data: SignInDto) => {
    if (showOtp && (!data.otp || data.otp.length !== 6)) {
      form.setError('otp', {
        type: 'manual',
        message: 'Please enter a valid 6-digit code',
      });
      return;
    }

    startTransition(async () => {
      if (!showOtp && !showEmailVerification) {
        await handleSignIn(data);
      } else if (showOtp) {
        await handleOtpSubmit(data);
      }
    });
  };

  const handleResendVerification = () => {
    setResendStatus({});
    startTransition(async () => {
      try {
        const response = await resendEmailAction(form.getValues('email'));
        setResendStatus({
          success: response.success,
          message: response.success
            ? 'Verification email has been resent successfully.'
            : response.message || 'Failed to resend verification email.',
        });
      } catch {
        setResendStatus({
          success: false,
          message:
            'An unexpected error occurred while sending the verification email.',
        });
      }
    });
  };

  const handleForgotPassword = (email: string) => {
    if (!isValidEmail(email)) {
      form.setError('email', {
        type: 'manual',
        message: 'Please enter a valid email address to reset your password',
      });
      return;
    }

    setForgotPasswordStatus({});
    setForgotPasswordPending(true);

    startTransition(async () => {
      try {
        const response = await forgotPasswordEmail(email);
        setForgotPasswordStatus({
          success: response.success,
          message: response.success
            ? 'If you have an account, you will receive a password reset email shortly.'
            : response.message || 'Failed to send password reset email.',
        });
      } catch {
        setForgotPasswordStatus({
          success: false,
          message:
            'An unexpected error occurred while sending the password reset email.',
        });
      } finally {
        setForgotPasswordPending(false);
      }
    });
  };

  const handleResendOtp = () => {
    setOtpStatus({});
    startTransition(async () => {
      try {
        const response = await signInAction(
          form.getValues('email'),
          form.getValues('password'),
        );

        if (response.code === 'otp_required') {
          setOtpStatus({
            success: true,
            message: 'A new verification code has been sent.',
          });
        } else if (response.code === 'otp_cooldown') {
          setOtpStatus({
            success: false,
            message:
              response.message || 'Please wait before requesting another code.',
          });
        } else {
          setOtpStatus({
            success: false,
            message: response.message || 'Failed to resend verification code.',
          });
        }
      } catch {
        setOtpStatus({
          success: false,
          message: 'An error occurred. Please try again.',
        });
      }
    });
  };

  const renderForgotPasswordView = () => (
    <div className="px-1">
      <AuthVerificationAlert
        icon={MailIcon}
        title={
          forgotPasswordStatus.success
            ? 'Password Reset Email Sent'
            : 'Password Reset Failed'
        }
        description={forgotPasswordStatus.message}
      />
      <div className="space-y-3 mt-4">
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setForgotPasswordStatus({})}
        >
          Back to Sign In
        </Button>
      </div>
    </div>
  );

  const renderEmailVerificationView = () => (
    <div className="px-1">
      <AuthVerificationAlert
        icon={MailIcon}
        title="Email Verification Required"
        description={
          <>
            We&apos;ve sent a verification email to
            <span className="font-medium"> {form.getValues('email')}</span>.
            Please check your inbox and click the verification link to activate
            your account.
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
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setShowEmailVerification(false)}
        >
          Back to Sign In
        </Button>
      </div>
    </div>
  );

  const renderSignInView = () => (
    <>
      <FormField
        key="email"
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
        key="password"
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Password</FormLabel>
              <div
                className="text-sm text-primary hover:underline cursor-pointer"
                onClick={() => handleForgotPassword(form.getValues('email'))}
              >
                {forgotPasswordPending ? (
                  <span>
                    <Loader2Icon className="mr-1 h-3 w-3 inline animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Forgot password?'
                )}
              </div>
            </div>
            <FormControl>
              <Input
                type="password"
                {...field}
                disabled={isPending}
                autoComplete="current-password"
                placeholder="••••••••••••••••"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  const renderOtpView = () => (
    <>
      <div className="mb-4">
        <AuthVerificationAlert
          icon={ShieldCheckIcon}
          title="Two-Factor Authentication"
          description={
            <>
              For added security, please enter the 6-digit code sent to
              <span className="font-medium"> {form.getValues('email')}.</span>
            </>
          }
        />
      </div>
      <FormField
        key="otp"
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
                onComplete={(value) => {
                  if (value.length === 6) {
                    form.clearErrors('otp');
                  }
                }}
              >
                <InputOTPGroup className="w-full">
                  {[...Array(6)].map((_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="w-[15%] md:w-[20%] h-12 text-2xl"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </FormControl>
            <FormMessage className="text-red-500" />

            {otpStatus.message && (
              <AuthVerificationError
                success={otpStatus.success}
                message={otpStatus.message}
              />
            )}

            <p className="text-sm text-muted-foreground mt-2">
              Didn&apos;t receive a code?{' '}
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                type="button"
                onClick={handleResendOtp}
              >
                Resend code
              </Button>
            </p>
          </FormItem>
        )}
      />
    </>
  );

  const renderFormContent = () => {
    if (forgotPasswordStatus.message) {
      return renderForgotPasswordView();
    }

    if (showEmailVerification) {
      return renderEmailVerificationView();
    }

    return !showOtp ? renderSignInView() : renderOtpView();
  };

  const shouldShowFooter =
    !showEmailVerification && !forgotPasswordStatus.message;

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
        <CardContent className="space-y-4">{renderFormContent()}</CardContent>
        {shouldShowFooter && (
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
