import type { ReactNode } from 'react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { redirect } from 'next/navigation';
import { OAuthButtons } from '@/components/features/auth/oauth-buttons';
import { handleAuthenticationRedirection } from '@/lib/auth-server';

type AuthenticationFormLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AuthenticationFormLayout({
  children,
}: AuthenticationFormLayoutProps) {
  const { isAuthenticated, redirectTo } =
    await handleAuthenticationRedirection();

  if (isAuthenticated) redirect(redirectTo);

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid lg:grid-cols-2 gap-0">
        <div>
          <CardHeader className="space-y-2">
            <CardTitle className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
              👋 It&apos;s nice to see you!
            </CardTitle>
            <CardDescription className="leading-7 text-left mb-2">
              Join our application to access your personalized dashboard, manage
              your preferences, and enjoy a seamless experience.
            </CardDescription>
            <OAuthButtons />
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
          </CardHeader>
          {children}
        </div>
        <div className="hidden lg:block mx-4 pb-4">
          <div className="bg-accent h-full rounded-lg px-6 py-4">
            <div className="flex flex-col items-center justify-center h-full"></div>
          </div>
        </div>
      </div>
    </Card>
  );
}
