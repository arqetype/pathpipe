import { UUID } from 'crypto';
import verifyEmailAction from '../../../../../actions/auth/verify-email';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import Link from 'next/link';

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
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Email Verification Failed
          </CardTitle>
          <CardDescription className="mt-4">
            Oups ! This link is invalid or has expired. Please check your email.
          </CardDescription>
          <CardDescription className="space-y-4 flex-col mt-6">
            <Link className="w-full" href="/app/sign-in">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const response = await verifyEmailAction(token);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {response.success
            ? 'Email Address Verified'
            : 'Email Verification Failed'}
        </CardTitle>
        <CardDescription className="mt-4">
          {response.success
            ? 'Your email address has been successfully verified!'
            : `Oups ! This link is invalid or has expired. Please check your email.`}
          <br />
          {response.success && 'You can now proceed to log in.'}
        </CardDescription>
        <CardDescription className="space-y-4 flex-col mt-6">
          <Link className="w-full" href="/app/sign-in">
            <Button className="w-full">Go to Sign In</Button>
          </Link>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
