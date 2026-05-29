import type { ReactNode } from 'react';

type AuthenticationLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function AuthenticationLayout({
  children,
}: AuthenticationLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center dark:bg-background bg-muted/40 p-4">
      <div className="w-full max-w-4xl space-y-4">{children}</div>
    </div>
  );
}
