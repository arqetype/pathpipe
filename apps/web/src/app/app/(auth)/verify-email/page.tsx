import { UUID } from 'crypto';
import verifyEmailAction from '@/actions/auth/verify-email';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import { CheckCircle, AlertCircle } from 'lucide-react';

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: UUID;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card className="border shadow-md max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Verification Failed
          </CardTitle>
          <CardDescription className="text-base">
            This verification link is invalid or has expired.
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
        <CardFooter className="flex flex-col gap-2 px-6 pt-2 pb-6">
          <Link className="w-full" href="/app/sign-in">
            <Button className="w-full" variant="default">
              Go to Sign In
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const response = await verifyEmailAction(token);

  if (response.success) {
    return (
      <Card className="border shadow-md max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Verification Successful
          </CardTitle>
          <CardDescription className="text-base">
            Your email address has been successfully verified!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center px-6">
          <div className="bg-success/10 rounded-lg p-4 text-success-foreground text-sm mt-2">
            <p>
              Your account is now active. You can access all features of your
              account.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 px-6 pt-2 pb-6">
          <Link className="w-full" href="/app/sign-in">
            <Button className="w-full" variant="default">
              Continue to Sign In
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  } else {
    return (
      <Card className="border shadow-md max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Verification Failed
          </CardTitle>
          <CardDescription className="text-base">
            This verification link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center px-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm mt-2">
            <p>This may be because:</p>
            <ul className="list-disc ml-6 mt-2 text-left">
              <li>The verification link has already been used</li>
              <li>The verification link has expired (valid for 24 hours)</li>
              <li>The verification token is incorrect</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 px-6 pt-2 pb-6">
          <Link className="w-full" href="/app/sign-in">
            <Button className="w-full" variant="default">
              Go to Sign In
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }
}
