import { CardContent, CardFooter } from '@repo/ui/components/card';
import { buttonVariants } from '@repo/ui/components/button';
import Link from 'next/link';
import { SignUpForm } from '@/components/features/auth/forms/sign-up-form';
import { SIGNUP_CLOSED } from '@/lib/signup-closed';

export default function SignUpPage() {
  if (!SIGNUP_CLOSED) return <SignUpForm />;

  return (
    <>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Registration is closed for the moment. Existing accounts can still
          sign in.
        </p>
      </CardContent>
      <CardFooter className="space-y-4 flex-col bg-transparent border-none">
        <Link
          href="/app/sign-in"
          className={buttonVariants({ size: 'lg', className: 'w-full' })}
        >
          Go to sign in
        </Link>
      </CardFooter>
    </>
  );
}
