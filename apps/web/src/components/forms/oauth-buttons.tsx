'use client';

import { Button } from '@repo/ui/components/button';
import { useState } from 'react';
import GoogleIcon from '@/components/icons/google';
import GitHubIcon from '@/components/icons/github';

export function OAuthButtons() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleGitHubSignIn = () => {
    setIsLoading('github');
    // Redirect to the GitHub auth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/github`;
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1"
        type="button"
        disabled={true}
      >
        <GoogleIcon />
        <span className="ml-2">Connect with Google</span>
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        type="button"
        disabled={isLoading === 'github'}
        onClick={handleGitHubSignIn}
      >
        {isLoading === 'github' ? (
          <div className="flex items-center justify-center">
            <span>Signing in...</span>
          </div>
        ) : (
          <>
            <GitHubIcon />
            <span className="ml-2">Connect with GitHub</span>
          </>
        )}
      </Button>
    </div>
  );
}
