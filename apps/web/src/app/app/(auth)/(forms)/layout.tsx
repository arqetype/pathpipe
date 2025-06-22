import type { ReactNode } from 'react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import GoogleIcon from '@/components/icons/google';
import GitHubIcon from '@/components/icons/github';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type AuthenticationFormLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AuthenticationFormLayout({
  children,
}: AuthenticationFormLayoutProps) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token');
  if (authToken) redirect('/app');

  return (
    <Card>
      <div className="grid lg:grid-cols-2 gap-0">
        <div>
          <CardHeader className="space-x-0 space-y-4 px-6 mb-4">
            <CardTitle className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
              👋 It&apos;s nice to see you!
            </CardTitle>
            <CardDescription className="leading-7 [&:not(:first-child)]:mt-6 text-left">
              Join our application to access your personalized dashboard, manage
              your preferences, and enjoy a seamless experience.
            </CardDescription>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                disabled
              >
                <GoogleIcon />
                Connect with Google
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                disabled
              >
                <GitHubIcon />
                Connect with GitHub
              </Button>
            </div>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
          </CardHeader>
          <div>{children}</div>
        </div>
        <div className="hidden lg:block mx-6">
          <div className="bg-accent h-full rounded-lg px-6 py-4">
            <div className="flex flex-col items-center justify-center h-full"></div>
          </div>
        </div>
      </div>
    </Card>
  );
}
