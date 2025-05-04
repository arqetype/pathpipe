'use client';

import React from 'react';
import { CookieConsent } from '@repo/ui/components/cookie-consent';
import { useCookieConsent } from '@/components/providers/cookie-consent-provider';

export default function CookieBanner() {
  const { setHasCookieConsent } = useCookieConsent();

  const handleCookieConsent = (isAccepted: boolean) => {
    document.cookie = `cookieConsent=${isAccepted}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setHasCookieConsent(isAccepted);
  };

  return (
    <CookieConsent
      variant="small"
      onAcceptCallback={() => handleCookieConsent(true)}
      onDeclineCallback={() => handleCookieConsent(false)}
    />
  );
}
