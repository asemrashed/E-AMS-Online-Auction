import type { Config } from 'tailwindcss';

// Hex CSS variables cannot take Tailwind's `/opacity` modifiers unless we
// mix in the alpha at compile time (e.g. bg-success-green/15, bg-primary/5).
const token = (name: string) =>
  `color-mix(in srgb, var(${name}) calc(100% * <alpha-value>), transparent)`;

// Colors are wired to CSS variables (see globals.css) so every semantic token
// automatically resolves correctly in both light and dark mode.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: token('--background'),
        'on-background': token('--on-background'),
        surface: token('--surface'),
        'surface-container-lowest': token('--surface-container-lowest'),
        'surface-container-low': token('--surface-container-low'),
        'surface-container': token('--surface-container'),
        'surface-container-high': token('--surface-container-high'),
        'surface-container-highest': token('--surface-container-highest'),
        'on-surface': token('--on-surface'),
        'on-surface-variant': token('--on-surface-variant'),
        outline: token('--outline'),
        'outline-variant': token('--outline-variant'),
        'border-muted': token('--border-muted'),
        'surface-gray': token('--surface-gray'),

        primary: token('--primary'),
        'on-primary': token('--on-primary'),
        'primary-container': token('--primary-container'),
        'on-primary-container': token('--on-primary-container'),

        secondary: token('--secondary'),
        'on-secondary': token('--on-secondary'),
        'secondary-container': token('--secondary-container'),
        'on-secondary-container': token('--on-secondary-container'),

        tertiary: token('--tertiary'),
        'on-tertiary': token('--on-tertiary'),
        'tertiary-container': token('--tertiary-container'),
        'on-tertiary-container': token('--on-tertiary-container'),

        'urgent-red': token('--urgent-red'),
        'success-green': token('--success-green'),
      },
      fontFamily: {
        headline: ['Hanken Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'headline-xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'headline-lg-mobile': ['28px', { lineHeight: '34px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-numeric': ['16px', { lineHeight: '16px', fontWeight: '500' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '700' }],
      },
      borderRadius: { sm: '0.25rem', DEFAULT: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem', full: '9999px' },
      spacing: { gutter: '24px', 'margin-mobile': '16px', 'margin-desktop': '48px' },
      maxWidth: { 'container-max': '1440px' },
      boxShadow: {
        level2: '0px 4px 20px rgba(0,0,0,0.05)',
        level3: '0px 10px 30px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
export default config;
