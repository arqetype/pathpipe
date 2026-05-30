'use client';

import { Button } from '@repo/ui/components/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { RiErrorWarningLine } from '@remixicon/react';
import GoogleIcon from '@repo/ui/components/icons/google';
import LinkedInIcon from '@repo/ui/components/icons/linkedin';

export function OAuthButtons() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (error === 'google_auth_failed') {
      toast.error('Google authentication failed. Please try again.');
    }
    if (error === 'linkedin_auth_failed') {
      toast.error('LinkedIn authentication failed. Please try again.');
    }
  }, [error]);

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleGoogleSignIn = () => {
    setIsLoading('google');
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  const handleLinkedInSignIn = () => {
    setIsLoading('linkedin');
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/linkedin`;
  };

  return (
    <div className="w-full flex flex-col">
      {error && (
        <div className="mb-4 text-red-600 text-center flex items-center justify-center text-xs sm:text-sm">
          <RiErrorWarningLine className="inline mr-1" size={16} />
          {error === 'google_auth_failed' &&
            'Google authentication failed. Please try again.'}
          {error === 'linkedin_auth_failed' &&
            'LinkedIn authentication failed. Please try again.'}
        </div>
      )}
      <div className="flex gap-2 sm:flex-row flex-col">
        <Button
          variant="outline"
          className="flex-1"
          type="button"
          size="lg"
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
          size="lg"
          disabled={isLoading === 'linkedin'}
          onClick={handleLinkedInSignIn}
        >
          {isLoading === 'linkedin' ? (
            <div className="flex items-center justify-center">
              <span>Signing in...</span>
            </div>
          ) : (
            <>
              <LinkedInIcon />
              <span className="ml-1">Connect with LinkedIn</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
