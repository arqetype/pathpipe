import { Button } from '@repo/ui/components/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Button>Start Building Now</Button>
      <Link href={'/app/sign-in'} className="ml-4">
        <Button variant="outline">Sign In</Button>
      </Link>
      <Link href={'/app/sign-up'} className="ml-4">
        <Button variant="outline">Sign Up</Button>
      </Link>
    </div>
  );
}
