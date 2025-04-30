import React from 'react';
import '@testing-library/jest-dom';
import RootLayout from '../layout';

jest.mock('next/font/local', () => ({
  __esModule: true,
  default: () => ({
    variable: 'mocked-font-variable',
  }),
}));

jest.mock('../../components/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

describe('RootLayout', () => {
  it('renders with correct structure and attributes', () => {
    const rootLayout = RootLayout({ children: <div>Test Child</div> });

    expect(rootLayout.type).toBe('html');
    expect(rootLayout.props.lang).toBe('en');

    const bodyElement = rootLayout.props.children;
    expect(bodyElement.type).toBe('body');
    expect(bodyElement.props.className).toContain('mocked-font-variable');

    const themeProvider = bodyElement.props.children;
    expect(themeProvider.type.name).toBe('ThemeProvider');
  });
});
