import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostHogProvider } from '../posthog-provider';
import posthog from 'posthog-js';

jest.mock('posthog-js', () => ({
  init: jest.fn(),
  capture: jest.fn(),
  opt_in_capturing: jest.fn(),
  opt_out_capturing: jest.fn(),
}));

jest.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
  usePostHog: jest.fn(() => ({
    capture: jest.fn(),
  })),
}));

import * as cookieConsentModule from '../cookie-consent-provider';

jest.mock('../cookie-consent-provider', () => ({
  useCookieConsent: jest.fn(() => ({
    hasCookieConsent: false,
    setHasCookieConsent: jest.fn(),
  })),
}));

const mockPathname = jest.fn();
const mockSearchParams = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => ({
    toString: () => mockSearchParams(),
  }),
}));

const originalEnv = process.env;

describe('PostHogProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_POSTHOG_KEY: 'test-key',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://test.posthog.com',
      NODE_ENV: 'test',
    };

    mockPathname.mockReturnValue('/test-path');
    mockSearchParams.mockReturnValue('param=value');

    Object.defineProperty(window, 'origin', {
      value: 'http://localhost',
    });
    (cookieConsentModule.useCookieConsent as jest.Mock).mockReturnValue({
      hasCookieConsent: false,
      setHasCookieConsent: jest.fn(),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('opts out of capturing when cookie consent is false', () => {
    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(posthog.opt_out_capturing).toHaveBeenCalled();
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
  });

  it('opts in to capturing when cookie consent is true', () => {
    (cookieConsentModule.useCookieConsent as jest.Mock).mockReturnValue({
      hasCookieConsent: true,
      setHasCookieConsent: jest.fn(),
    });

    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(posthog.opt_in_capturing).toHaveBeenCalled();
    expect(posthog.opt_out_capturing).not.toHaveBeenCalled();
  });

  it('initializes posthog with the correct parameters', () => {
    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(posthog.init).toHaveBeenCalledWith('test-key', {
      api_host: 'https://test.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: 'always',
      debug: false,
    });
  });

  it('uses default posthog host when not provided', () => {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = '';

    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(posthog.init).toHaveBeenCalledWith('test-key', {
      api_host: 'https://eu.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: 'always',
      debug: false,
    });
  });

  it('sets debug mode to true in development', () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_POSTHOG_KEY: 'test-key',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://test.posthog.com',
      NODE_ENV: 'development',
    };

    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(posthog.init).toHaveBeenCalledWith(
      'test-key',
      expect.objectContaining({
        debug: true,
      }),
    );
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('renders with proper structure', () => {
    const { getByTestId } = render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(getByTestId('posthog-provider')).toBeInTheDocument();
  });
});
