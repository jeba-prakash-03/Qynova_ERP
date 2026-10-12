/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Core Tokens
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          soft: '#EEF2FF',
        },
        page: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        text: '#0F172A',
        body: '#475569',
        muted: '#64748B',

        // Brand Palette Backward Compatibility
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },

        // Design System Status Tokens
        status: {
          present: { DEFAULT: '#16A34A', bg: '#DCFCE7', text: '#15803D' },
          absent: { DEFAULT: '#DC2626', bg: '#FEE2E2', text: '#B91C1C' },
          warning: { DEFAULT: '#D97706', bg: '#FEF3C7', text: '#B45309' },
          leave: { DEFAULT: '#0284C7', bg: '#E0F2FE', text: '#0369A1' },
          holiday: { DEFAULT: '#7C3AED', bg: '#EDE9FE', text: '#6D28D9' },
          wfh: { DEFAULT: '#0D9488', bg: '#CCFBF1', text: '#0F766E' },
          neutral: { DEFAULT: '#94A3B8', bg: '#F1F5F9', text: '#475569' },
        }
      },
    },
  },
  plugins: [],
}
