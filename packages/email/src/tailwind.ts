import type { TailwindConfig } from 'react-email';

export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'oklch(0.508 0.118 165.612)',
        },
        ['primary-foreground']: {
          DEFAULT: 'oklch(0.979 0.021 166.113)',
        },
        secondary: {
          DEFAULT: 'oklch(0.967 0.001 286.375)',
        },
        ['secondary-foreground']: {
          DEFAULT: 'oklch(0.21 0.006 285.885)',
        },
        background: {
          DEFAULT: 'oklch(1 0 0)',
        },
        foreground: {
          DEFAULT: 'oklch(0.153 0.006 107.1)',
        },
        muted: {
          DEFAULT: 'oklch(0.966 0.005 106.5)',
        },
        ['muted-foreground']: {
          DEFAULT: 'oklch(0.58 0.031 107.3)',
        },
        accent: {
          DEFAULT: 'oklch(0.966 0.005 106.5)',
        },
        ['accent-foreground']: {
          DEFAULT: 'oklch(0.228 0.013 107.4)',
        },
        destructive: {
          DEFAULT: 'oklch(0.577 0.245 27.325)',
        },
        border: {
          DEFAULT: 'oklch(0.93 0.007 106.5)',
        },
        input: {
          DEFAULT: 'oklch(0.93 0.007 106.5)',
        },
        ring: {
          DEFAULT: 'oklch(0.737 0.021 106.9)',
        },
      },
    },
    fontSize: {
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['14px', { lineHeight: '20px' }],
      base: ['16px', { lineHeight: '24px' }],
      lg: ['18px', { lineHeight: '28px' }],
      xl: ['20px', { lineHeight: '28px' }],
      '2xl': ['24px', { lineHeight: '32px' }],
      '3xl': ['30px', { lineHeight: '36px' }],
      '4xl': ['36px', { lineHeight: '36px' }],
      '5xl': ['48px', { lineHeight: '1' }],
      '6xl': ['60px', { lineHeight: '1' }],
      '7xl': ['72px', { lineHeight: '1' }],
      '8xl': ['96px', { lineHeight: '1' }],
      '9xl': ['144px', { lineHeight: '1' }],
    },
    spacing: {
      px: '1px',
      0: '0',
      0.5: '2px',
      1: '4px',
      1.5: '6px',
      2: '8px',
      2.5: '10px',
      3: '12px',
      3.5: '14px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '28px',
      8: '32px',
      9: '36px',
      10: '40px',
      11: '44px',
      12: '48px',
      14: '56px',
      16: '64px',
      20: '80px',
      24: '96px',
      28: '112px',
      32: '128px',
      36: '144px',
      40: '160px',
      44: '176px',
      48: '192px',
      52: '208px',
      56: '224px',
      60: '240px',
      64: '256px',
      72: '288px',
      80: '320px',
      96: '384px',
    },
  },
} satisfies TailwindConfig;
