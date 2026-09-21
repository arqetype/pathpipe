'use client';

import { Controller, type Control } from 'react-hook-form';
import { CardContent, CardFooter } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Field, FieldLabel, FieldError } from '@repo/ui/components/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@repo/ui/components/input-otp';
import {
  RiErrorWarningLine,
  RiLoader5Line,
  RiShieldCheckLine,
  RiMailLine,
} from '@remixicon/react';
import { AuthVerificationAlert } from '@repo/ui/components/customs/auth-verification-alert';
import { AuthVerificationError } from '@repo/ui/components/customs/auth-verification-error';
import { SignInDto } from '@repo/db/dto/auth/sign-in.dto';

export type StatusState = {
  success?: boolean;
  message?: string;
  is_google_user?: boolean;
  is_linkedin_user?: boolean;
  provider_detected?: boolean;
};

interface ForgotPasswordStepProps {
  status: StatusState;
  onBack: () => void;
}

export function ForgotPasswordStep({
  status,
  onBack,
}: ForgotPasswordStepProps) {
  return status.provider_detected ? (
    <>
      <CardContent className="space-y-4">
        <AuthVerificationAlert
          icon={RiErrorWarningLine}
          title={
            status.is_linkedin_user
              ? 'LinkedIn User Detected'
              : 'Google User Detected'
          }
          description={status.message}
        />
      </CardContent>
      <CardFooter className="flex-col bg-transparent border-none">
        <Button variant="ghost" className="w-full" onClick={onBack}>
          Back to Sign In
        </Button>
      </CardFooter>
    </>
  ) : (
    <>
      <CardContent className="space-y-4">
        <AuthVerificationAlert
          icon={RiMailLine}
          title={
            status.success
              ? 'Password Reset Email Sent'
              : 'Password Reset Failed'
          }
          description={status.message}
        />
      </CardContent>
      <CardFooter className="flex-col bg-transparent border-none">
        <Button variant="ghost" className="w-full" onClick={onBack}>
          Back to Sign In
        </Button>
      </CardFooter>
    </>
  );
}

interface EmailVerificationStepProps {
  email: string;
  status: StatusState;
  isPending: boolean;
  onResend: () => void;
  onBack: () => void;
}

export function EmailVerificationStep({
  email,
  status,
  isPending,
  onResend,
  onBack,
}: EmailVerificationStepProps) {
  return (
    <>
      <CardContent className="space-y-4">
        <AuthVerificationAlert
          icon={RiMailLine}
          title="Email Verification Required"
          description={
            <>
              We&apos;ve sent a verification email to
              <span className="font-medium"> {email}</span>. Please check your
              inbox and click the verification link to activate your account.
            </>
          }
        />
        <div className="space-y-3">
          {status.message && (
            <AuthVerificationError
              success={status.success}
              message={status.message}
            />
          )}
          <Button
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={onResend}
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
        </div>
      </CardContent>
      <CardFooter className="space-y-4 flex-col bg-transparent border-none">
        <Button variant="ghost" className="w-full" onClick={onBack}>
          Back to Sign In
        </Button>
      </CardFooter>
    </>
  );
}

interface OtpStepProps {
  control: Control<SignInDto>;
  email: string;
  status: StatusState;
  onClearError: () => void;
  onResend: () => void;
}

export function OtpStep({
  control,
  email,
  status,
  onClearError,
  onResend,
}: OtpStepProps) {
  return (
    <Controller
      name="otp"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <CardContent className="space-y-4">
            <div className="mb-4">
              <AuthVerificationAlert
                icon={RiShieldCheckLine}
                title="Two-Factor Authentication"
                description={
                  <>
                    For added security, please enter the 6-digit code sent to
                    <span className="font-medium"> {email}.</span>
                  </>
                }
              />
            </div>
            <FieldLabel htmlFor={field.name}>
              Enter verification code
            </FieldLabel>
            <InputOTP
              maxLength={6}
              {...field}
              id={field.name}
              className="w-full gap-2"
              aria-invalid={fieldState.invalid}
              onComplete={(value) => {
                if (value.length === 6) {
                  onClearError();
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
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}

            {status.message && (
              <AuthVerificationError
                success={status.success}
                message={status.message}
              />
            )}
          </CardContent>

          <CardFooter className="space-y-4 flex-col bg-transparent border-none">
            <p className="text-sm text-muted-foreground mt-2">
              Didn&apos;t receive a code?{' '}
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                type="button"
                onClick={onResend}
              >
                Resend code
              </Button>
            </p>
          </CardFooter>
        </Field>
      )}
    />
  );
}
