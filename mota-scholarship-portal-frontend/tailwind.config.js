/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'gov-blue': {
          DEFAULT: '#0b3b75',
          dark: '#082c59',
          light: '#1e40af',
          ultralight: '#eff6ff',
        },
        'gov-saffron': {
          DEFAULT: '#c2610c',
          dark: '#9a3412',
          light: '#f59e0b',
        },
        'gov-green': {
          DEFAULT: '#15803d',
          dark: '#166534',
          surface: '#f0fdf4',
        },
        'gov-slate': {
          bg: '#f8fafc',
          border: '#cbd5e1',
          muted: '#64748b',
        },
        'portal-navy': {
          DEFAULT: '#0b2546',
          dark: '#08284d',
          deep: '#06182e',
        },
        'portal-amber': {
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};