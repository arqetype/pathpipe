import React from 'react';
import { render } from '@testing-library/react';
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
  it('renders the layout with children and theme provider', () => {
    const { getByTestId, getByText } = render(
      <RootLayout>
        <div>Test Child</div>
      </RootLayout>
    );

    const themeProvider = getByTestId('theme-provider');
    expect(themeProvider).toBeInTheDocument();

    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('has the correct html attributes', () => {
    render(
      <RootLayout>
        <div>Test Child</div>
      </RootLayout>
    );

    const html = document.documentElement;
    expect(html).toHaveAttribute('lang', 'en');
  });

  it('applies font variables to the body', () => {
    render(
      <RootLayout>
        <div>Test Child</div>
      </RootLayout>
    );

    const body = document.body;
    expect(body).toHaveClass('mocked-font-variable mocked-font-variable');
  });
});
