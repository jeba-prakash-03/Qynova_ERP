/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Claymorphism Reference Design System Palette
        clay: {
          ground: '#c5d0be',
          surface: '#e2e8dc',
          'surface-secondary': '#dbe2d5',
          ink: '#26301f',
          muted: '#6b7663',
          teal: '#14776b',
          'teal-hover': '#106258',
          'teal-light': '#cfe4e1',
          rust: '#c4643f',
          'rust-hover': '#af5533',
          'rust-light': '#f6dfd8',
          brass: '#cf9b34',
          'brass-light': '#f7efdd',
          navy: '#22304a',
          'navy-light': '#dde5f0',
          positive: '#3f8f4a',
          'positive-light': '#d8ebd9',
          border: 'rgba(76, 91, 70, 0.14)',
        },

        // Core Design Tokens
        primary: {
          DEFAULT: '#14776b',
          hover: '#106258',
          soft: '#d8e6e2',
        },
        page: '#c5d0be',
        surface: '#e2e8dc',
        border: 'rgba(76, 91, 70, 0.14)',
        text: '#26301f',
        body: '#35422d',
        muted: '#6b7663',

        // Brand Palette Mapped to Claymorphism Tints
        brand: {
          50: '#f0f4ec',
          100: '#e2e8dc',
          200: '#dbe2d5',
          300: '#c5d0be',
          400: '#a3b49a',
          500: '#6b7663',
          600: '#14776b',
          700: '#106258',
          800: '#26301f',
          900: '#1a2215',
          950: '#0e140b',
        },

        // Design System Status Tokens - Clay Mapped
        status: {
          present: { DEFAULT: '#3f8f4a', bg: '#d8ebd9', text: '#1e5725' },
          absent: { DEFAULT: '#c4643f', bg: '#f6dfd8', text: '#8a3114' },
          warning: { DEFAULT: '#cf9b34', bg: '#f7efdd', text: '#855b11' },
          leave: { DEFAULT: '#22304a', bg: '#dde5f0', text: '#1c2a42' },
          holiday: { DEFAULT: '#60437a', bg: '#eadef2', text: '#44295c' },
          wfh: { DEFAULT: '#14776b', bg: '#d3ebe7', text: '#0e5950' },
          neutral: { DEFAULT: '#6b7663', bg: '#dbe2d5', text: '#3c4535' },
        }
      },
      fontFamily: {
        sans: ['Figtree', 'Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Baloo 2', 'Figtree', 'sans-serif'],
        heading: ['Baloo 2', 'sans-serif'],
      },
      boxShadow: {
        'clay-raised': '8px 10px 24px rgba(88, 104, 84, 0.28), -6px -7px 18px rgba(255, 255, 255, 0.78)',
        'clay-raised-sm': '4px 6px 14px rgba(88, 104, 84, 0.22), -3px -4px 10px rgba(255, 255, 255, 0.75)',
        'clay-raised-lg': '12px 14px 30px rgba(88, 104, 84, 0.30), -8px -10px 22px rgba(255, 255, 255, 0.85)',
        'clay-inset': 'inset 4px 5px 10px rgba(104, 118, 100, 0.30), inset -3px -4px 9px rgba(255, 255, 255, 0.70)',
        'clay-inset-sm': 'inset 2px 3px 6px rgba(104, 118, 100, 0.25), inset -2px -2px 5px rgba(255, 255, 255, 0.65)',
        'clay-teal': '6px 8px 18px rgba(20, 119, 107, 0.35), -4px -4px 12px rgba(255, 255, 255, 0.65)',
        'clay-rust': '6px 8px 18px rgba(196, 100, 63, 0.35), -4px -4px 12px rgba(255, 255, 255, 0.65)',
        'clay-pill-active': 'inset 3px 4px 8px rgba(10, 60, 54, 0.45), inset -2px -3px 6px rgba(255, 255, 255, 0.25)',
      },
      borderRadius: {
        'clay-card': '26px',
        'clay-control': '16px',
        'clay-pill': '999px',
      }
    },
  },
  plugins: [],
}
