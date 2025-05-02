import React from 'react';
import '@testing-library/jest-dom';
import RootLayout from '../layout';

jest.mock('next/font/local', () => ({
  __esModule: true,
  default: () => ({
    variable: 'mocked-font-variable',
  }),
}));

jest.mock('../../components/providers/PostHogProvider', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
}));

jest.mock('../../components/providers/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

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
    expect(postHogProvider.props['data-testid']).toBe('posthog-provider');

    // Verify ThemeProvider wraps app children
    const themeProvider = postHogProvider.props.children;
    expect(themeProvider.props['data-testid']).toBe('theme-provider');
    expect(themeProvider.props.children).toEqual(testChild);
  });
});