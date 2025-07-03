import MeetingList from '@/components/meeting-list';
import { buttonVariants } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

export default function AppMainPage() {
  return (
    <div>
      <p>
        Hello from the app main page ! here will be the dashboard of the meals
      </p>
      <Link
        href="/app/settings"
        className={cn(buttonVariants({ variant: 'outline' }), 'ml-4')}
      >
        Go to Settings
      </Link>
      <MeetingList />
    </div>
  );
}
