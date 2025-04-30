import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

type AuthenticationLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function AuthenticationLayout({
  children,
}: AuthenticationLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center mb-4">
          <Link
            href="/"
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to home
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
