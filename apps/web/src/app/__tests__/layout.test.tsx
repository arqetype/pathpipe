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

    expect(rootLayout.type).toBe('html');
    expect(rootLayout.props.lang).toBe('en');

    const bodyElement = rootLayout.props.children;
    expect(bodyElement.type).toBe('body');
    expect(bodyElement.props.className).toContain('mocked-font-variable');

    const postHogProvider = bodyElement.props.children;
    expect(postHogProvider.type).toEqual(expect.any(Function));
    expect(postHogProvider.type.name).toBe('PostHogProvider');

    const [cookieConsent, themeProvider] = postHogProvider.props.children;
    expect(cookieConsent.type).toEqual(expect.any(Function));
    expect(cookieConsent.type.name).toBe('CookieConsent');
    expect(cookieConsent.props.variant).toBe('small');

    expect(themeProvider.type).toEqual(expect.any(Function));
    expect(themeProvider.type.name).toBe('ThemeProvider');
    expect(themeProvider.props.children).toEqual(testChild);
  });
});
