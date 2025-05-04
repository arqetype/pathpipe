import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostHogProvider } from '../posthog-provider';
import posthog from 'posthog-js';

// Mock external dependencies
jest.mock('posthog-js', () => ({
  init: jest.fn(),
  capture: jest.fn(),
}));

jest.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
  usePostHog: jest.fn(() => ({
    capture: jest.fn(),
  })),
}));

// Mock Next.js navigation hooks
const mockPathname = jest.fn();
const mockSearchParams = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => ({
    toString: () => mockSearchParams(),
  }),
}));

// Store original env vars
const originalEnv = process.env;

describe('PostHogProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mock environment variables
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_POSTHOG_KEY: 'test-key',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://test.posthog.com',
      NODE_ENV: 'test',
    };

    // Configure default mock values
    mockPathname.mockReturnValue('/test-path');
    mockSearchParams.mockReturnValue('param=value');

    // Mock window.origin
    Object.defineProperty(window, 'origin', {
      value: 'http://localhost',
      writable: true,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
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
