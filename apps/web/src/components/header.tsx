'use client';

import { Button } from '@repo/ui/components/button';
import signOutAction from '../actions/auth/sign-out';
import { startTransition } from 'react';
import { User } from '@repo/db/entities/user';
import Image from 'next/image';

export default function Header(currentUser: Omit<User, 'hashPassword'> | null) {
  const handleSignOut = async () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <header className="w-full h-16 flex justify-between items-center px-4 border-b border-black/60">
      <p>Mealbud.AI</p>
      <div>
        <p>{currentUser ? `Welcome, ${currentUser.email}` : 'Please log in'}</p>
        {currentUser && currentUser.avatar_url && (
          <Image
            src={currentUser.avatar_url}
            alt="User Avatar"
            className="w-8 h-8 rounded-full"
            width={32}
            height={32}
          />
        )}
      </div>
      <Button variant="outline" onClick={handleSignOut}>
        Sign out
      </Button>
    </header>
  );
}
