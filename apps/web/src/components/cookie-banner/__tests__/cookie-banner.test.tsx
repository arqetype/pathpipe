import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CookieBanner from '../cookie-banner';

jest.mock('@repo/ui/components/cookie-consent', () => ({
  CookieConsent: ({
    onAcceptCallback,
    onDeclineCallback,
  }: {
    variant: string;
    onAcceptCallback: () => void;
    onDeclineCallback: () => void;
  }) => (
    <div data-testid="cookie-consent">
      <button data-testid="accept-button" onClick={onAcceptCallback}>
        Accept
      </button>
      <button data-testid="decline-button" onClick={onDeclineCallback}>
        Decline
      </button>
    </div>
  ),
}));

const mockSetHasCookieConsent = jest.fn();
jest.mock('../../providers/cookie-consent-provider', () => ({
  useCookieConsent: () => ({
    hasCookieConsent: false,
    setHasCookieConsent: mockSetHasCookieConsent,
  }),
}));

describe('CookieBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = '';
  });

  it('renders the cookie consent component', () => {
    render(<CookieBanner />);
    expect(screen.getByTestId('cookie-consent')).toBeInTheDocument();
  });

  it('sets cookie and calls setHasCookieConsent with true when accepted', () => {
    render(<CookieBanner />);

    const acceptButton = screen.getByTestId('accept-button');
    fireEvent.click(acceptButton);

    expect(document.cookie).toContain('cookieConsent=true');
    expect(mockSetHasCookieConsent).toHaveBeenCalledWith(true);
  });

  it('sets cookie and calls setHasCookieConsent with false when declined', () => {
    render(<CookieBanner />);

    const declineButton = screen.getByTestId('decline-button');
    fireEvent.click(declineButton);

    expect(document.cookie).toContain('cookieConsent=false');
    expect(mockSetHasCookieConsent).toHaveBeenCalledWith(false);
  });

  it('sets the cookie with a one-year expiration', () => {
    render(<CookieBanner />);

    const setCookieSpy = jest.spyOn(document, 'cookie', 'set');

    const acceptButton = screen.getByTestId('accept-button');
    fireEvent.click(acceptButton);

    // NOTE: 365-day expiration (60 * 60 * 24 * 365)
    expect(setCookieSpy).toHaveBeenCalledWith(
      expect.stringContaining('max-age=31536000'),
    );
  });
});
