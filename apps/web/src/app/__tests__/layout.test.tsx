import React from 'react';
import '@testing-library/jest-dom';
import RootLayout from '../layout';

jest.mock('next/font/local', () => ({
  __esModule: true,
  default: () => ({
    variable: 'mocked-font-variable',
  }),
}));

jest.mock('lucide-react', () => ({
  __esModule: true,
  default: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-cookie"
    >
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
      <path d="M8.5 8.5v.01"></path>
      <path d="M16 15.5v.01"></path>
      <path d="M12 12v.01"></path>
      <path d="M11 17v.01"></path>
      <path d="M7 14v.01"></path>
    </svg>
  ),
}));

jest.mock('../../components/providers/posthog-provider', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('../../components/providers/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('../../components/providers/cookie-consent-provider', () => ({
  CookieConsentProvider: ({
    children,
    initialConsent,
  }: {
    children: React.ReactNode;
    initialConsent: boolean;
  }) => (
    <div
      data-testid="cookie-consent-provider"
      data-initial-consent={initialConsent}
    >
      {children}
    </div>
  ),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => {
    return {
      get: jest.fn((name) => {
        return name === 'cookieConsent' ? { value: 'false' } : undefined;
      }),
    };
  }),
}));

describe('RootLayout', () => {
  it('renders with correct structure and attributes', async () => {
    const testChild = <div>Test Child</div>;
    const rootLayout = await RootLayout({ children: testChild });

    expect(rootLayout.type).toBe('html');
    expect(rootLayout.props.lang).toBe('en');

    const bodyElement = rootLayout.props.children;
    expect(bodyElement.type).toBe('body');
    expect(bodyElement.props.className).toContain('mocked-font-variable');

    const themeProvider = bodyElement.props.children;
    expect(themeProvider.type).toEqual(expect.any(Function));
    expect(themeProvider.type.name).toBe('ThemeProvider');

    const cookieConsentProvider = themeProvider.props.children;
    expect(cookieConsentProvider.type).toEqual(expect.any(Function));
    expect(cookieConsentProvider.type.name).toBe('CookieConsentProvider');
    expect(cookieConsentProvider.props.initialConsent).toBe(false);

    const [postHogProvider, cookieBanner] =
      cookieConsentProvider.props.children;
    expect(postHogProvider.type).toEqual(expect.any(Function));
    expect(postHogProvider.type.name).toBe('PostHogProvider');
    expect(postHogProvider.props.children).toEqual(testChild);

    expect(cookieBanner).toBeDefined();
    expect(cookieBanner.type.name).toBe('CookieBanner');
  });
});
