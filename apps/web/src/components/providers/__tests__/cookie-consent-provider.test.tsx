import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  CookieConsentProvider,
  useCookieConsent,
} from '../cookie-consent-provider';

Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

function TestConsumer() {
  const { hasCookieConsent, setHasCookieConsent } = useCookieConsent();
  return (
    <div>
      <div data-testid="consent-status">
        {hasCookieConsent ? 'true' : 'false'}
      </div>
      <button
        data-testid="toggle-consent"
        onClick={() => setHasCookieConsent(!hasCookieConsent)}
      >
        Toggle Consent
      </button>
    </div>
  );
}

describe('CookieConsentProvider', () => {
  beforeEach(() => {
    document.cookie = '';
    jest.clearAllMocks();
  });

  it('provides default consent value as false', () => {
    render(
      <CookieConsentProvider>
        <TestConsumer />
      </CookieConsentProvider>,
    );

    expect(screen.getByTestId('consent-status')).toHaveTextContent('false');
  });

  it('respects initialConsent prop when provided', () => {
    render(
      <CookieConsentProvider initialConsent={true}>
        <TestConsumer />
      </CookieConsentProvider>,
    );

    expect(screen.getByTestId('consent-status')).toHaveTextContent('true');
  });

  it('allows changing consent value through context', () => {
    render(
      <CookieConsentProvider>
        <TestConsumer />
      </CookieConsentProvider>,
    );

    expect(screen.getByTestId('consent-status')).toHaveTextContent('false');

    act(() => {
      screen.getByTestId('toggle-consent').click();
    });

    expect(screen.getByTestId('consent-status')).toHaveTextContent('true');
  });

  it('reads cookie value on mount', () => {
    document.cookie = 'cookieConsent=true; path=/';

    render(
      <CookieConsentProvider>
        <TestConsumer />
      </CookieConsentProvider>,
    );

    expect(screen.getByTestId('consent-status')).toHaveTextContent('true');
  });

  it('prioritizes cookie value over initialConsent prop', () => {
    document.cookie = 'cookieConsent=false; path=/';

    render(
      <CookieConsentProvider initialConsent={true}>
        <TestConsumer />
      </CookieConsentProvider>,
    );

    expect(screen.getByTestId('consent-status')).toHaveTextContent('false');
  });

  it('handles cookie value "true" correctly', () => {
    document.cookie = 'cookieConsent=true; path=/';

    render(
      <CookieConsentProvider>
        <TestConsumer />
      </CookieConsentProvider>,
    );

    expect(screen.getByTestId('consent-status')).toHaveTextContent('true');
  });

  it('handles cookie value "false" correctly', () => {
    document.cookie = 'cookieConsent=false; path=/';

    render(
      <CookieConsentProvider>
        <TestConsumer />
      </CookieConsentProvider>,
    );

    expect(screen.getByTestId('consent-status')).toHaveTextContent('false');
  });

  it('throws error when hook is used outside provider', () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useCookieConsent must be used within a CookieConsentProvider');

    console.error = originalConsoleError;
  });
});
