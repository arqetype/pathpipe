import { buttonVariants } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

export default function AppMainPage() {
  return (
    <p>
      Hello from the app main page ! here will be the dashboard of the meals
      <Link
        href="/app/settings"
        className={cn(buttonVariants({ variant: 'outline' }), 'ml-4')}
      >
        Go to Settings
      </Link>
    </p>
  );
}
