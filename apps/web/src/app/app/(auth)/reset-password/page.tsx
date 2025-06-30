import ResetPasswordForm from '@/components/forms/reset-password-form';
import { buttonVariants } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { AlertCircleIcon } from 'lucide-react';
import resetPasswordUserAction from '@/actions/auth/reset-password-user';
import type { UUID } from 'node:crypto';

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: UUID }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card className="border shadow-md max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertCircleIcon className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Can&apos;t Reset Password
          </CardTitle>
          <CardDescription className="text-base">
            This reset password link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center px-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm mt-2">
            <p>
              Please check your email for a valid verification link or request a
              new one from your account settings.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 px-6 pt-2">
          <Link
            className={cn(buttonVariants({ variant: 'default' }), 'w-full')}
            href="/app/sign-in"
          >
            Go to Sign In
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const { user } = await resetPasswordUserAction(token);

  if (!user) {
    return (
      <Card className="border shadow-md max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertCircleIcon className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Can&apos;t Reset Password
          </CardTitle>
          <CardDescription className="text-base">
            This reset password link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center px-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm mt-2">
            <p>
              Please check your email for a valid verification link or request a
              new one from your account settings.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 px-6 pt-2">
          <Link
            className={cn(buttonVariants({ variant: 'default' }), 'w-full')}
            href="/app/sign-in"
          >
            Go to Sign In
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (user.is_github_user) {
    return (
      <Card className="border shadow-md max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertCircleIcon className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            GitHub User Detected
          </CardTitle>
          <CardDescription className="text-base">
            You cannot reset your password as you signed up with GitHub.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center px-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm mt-2">
            <p>
              Please use your GitHub account to sign in or contact support for
              assistance.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 px-6 pt-2">
          <Link
            className={cn(buttonVariants({ variant: 'default' }), 'w-full')}
            href="/app/sign-in"
          >
            Go to Sign In
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return <ResetPasswordForm token={token} user={user} />;
}
