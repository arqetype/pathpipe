import React from 'react';
import '@testing-library/jest-dom';
import RootLayout from '../layout';

jest.mock('next/font/local', () => ({
  __esModule: true,
  default: () => ({
    variable: 'mocked-font-variable',
  }),
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

jest.mock('@repo/ui/components/cookie-consent', () => {
  return {
    CookieConsent: ({ variant }: { variant: string }) => (
      <div className={variant}>Cookie Consent</div>
    ),
  };
});

describe('RootLayout', () => {
  it('renders with correct structure and attributes', () => {
    const testChild = <div>Test Child</div>;
    const rootLayout = RootLayout({ children: testChild });

    // Verify html element
    expect(rootLayout.type).toBe('html');
    expect(rootLayout.props.lang).toBe('en');

    // Verify body element and font class
    const bodyElement = rootLayout.props.children;
    expect(bodyElement.type).toBe('body');
    expect(bodyElement.props.className).toContain('mocked-font-variable');

    // Verify PostHogProvider wraps ThemeProvider
    const postHogProvider = bodyElement.props.children;
    expect(postHogProvider.type).toEqual(expect.any(Function));
    expect(postHogProvider.type.name).toBe('PostHogProvider');

    // Verify children structure within providers
    const [cookieConsent, themeProvider] = postHogProvider.props.children;

    // Verify CookieConsent component
    expect(cookieConsent.type).toEqual(expect.any(Function));
    expect(cookieConsent.type.name).toBe('CookieConsent');
    expect(cookieConsent.props.variant).toBe('small');

    // Verify ThemeProvider wraps app children
    expect(themeProvider.type).toEqual(expect.any(Function));
    expect(themeProvider.type.name).toBe('ThemeProvider');
    expect(themeProvider.props.children).toEqual(testChild);
  });
});
