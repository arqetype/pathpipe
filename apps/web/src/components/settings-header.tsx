'use client';

import { signOutAction } from '@/actions/auth/sign-out';
import { Button, buttonVariants } from '@repo/ui/components/button';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import ThemeSwitcher from './theme-switcher';

export default function SettingsHeader() {
  const handleSignOut = async () => {
    await signOutAction();
  };

  return (
    <header className="mb-4 w-full flex items-center justify-between">
      <Link href="/app/" className={buttonVariants({ variant: 'default' })}>
        <ArrowLeftIcon />
        Back to App
      </Link>
      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        <form>
          <Button onClick={handleSignOut} variant={'outline'}>
            Sign Out
          </Button>
        </form>
      </div>
    </header>
  );
}
