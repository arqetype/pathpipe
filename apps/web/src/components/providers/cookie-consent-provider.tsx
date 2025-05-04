'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CookieConsentContextType {
  hasCookieConsent: boolean;
  setHasCookieConsent: (consent: boolean) => void;
}

const CookieConsentContext = createContext<
  CookieConsentContextType | undefined
>(undefined);

export function CookieConsentProvider({
  children,
  initialConsent = false,
}: {
  children: React.ReactNode;
  initialConsent?: boolean;
}) {
  const [hasCookieConsent, setHasCookieConsent] = useState(initialConsent);

  useEffect(() => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('cookieConsent='))
      ?.split('=')[1];

    if (cookieValue !== undefined) {
      setHasCookieConsent(cookieValue === 'true');
    }
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{ hasCookieConsent, setHasCookieConsent }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error(
      'useCookieConsent must be used within a CookieConsentProvider',
    );
  }
  return context;
}
