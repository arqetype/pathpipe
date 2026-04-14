'use client';

import { Button } from '@repo/ui/components/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { TriangleAlertIcon } from 'lucide-react';
import GoogleIcon from '@repo/ui/components/icons/google';
import GitHubIcon from '@repo/ui/components/icons/github';

export function OAuthButtons() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (error === 'google_auth_failed') {
      toast.error('Google authentication failed. Please try again.');
    }
    if (error === 'github_auth_failed') {
      toast.error('GitHub authentication failed. Please try again.');
    }
  }, [error]);

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleGitHubSignIn = () => {
    setIsLoading('github');
    // Redirect to the GitHub auth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/github`;
  };

  const handleGoogleSignIn = () => {
    setIsLoading('google');
    // Redirect to the Google auth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <div className="w-full flex flex-col">
      {error && (
        <div className="mb-4 text-red-600 text-center flex items-center justify-center text-xs sm:text-sm">
          <TriangleAlertIcon className="inline mr-1" size={16} />
          {error === 'google_auth_failed' &&
            'Google authentication failed. Please try again.'}
          {error === 'github_auth_failed' &&
            'GitHub authentication failed. Please try again.'}
        </div>
      )}
      <div className="flex gap-2 sm:flex-row flex-col">
        <Button
          variant="outline"
          className="flex-1"
          type="button"
          disabled={isLoading === 'google'}
          onClick={handleGoogleSignIn}
        >
          {isLoading === 'google' ? (
            <div className="flex items-center justify-center">
              <span>Signing in...</span>
            </div>
          ) : (
            <>
              <GoogleIcon />
              <span className="ml-1">Connect with Google</span>
            </>
          )}
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
              <span className="ml-1">Connect with GitHub</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
