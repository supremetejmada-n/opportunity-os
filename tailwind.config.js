/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        env: {
          DEFAULT: '#161E2F',
          dark: '#101623',
        },
        navy: {
          950: '#161E2F',
          900: '#1A2337',
          850: '#202B41',
          800: '#242F49',
          700: '#2D3B5B',
          600: '#384358',
        },
        peach: {
          500: '#FFA586',
          400: '#FFB79D',
          600: '#F09271',
          700: '#E07C5A',
        },
        crimson: {
          500: '#B51A2B',
          600: '#9B1323',
          400: '#C72E3F',
        },
        burgundy: {
          900: '#541A2E',
          800: '#671D37',
        },
        slate: {
          950: '#161E2F',
          900: '#242F49',
          850: '#2D3B5B',
          800: '#384358',
          700: '#48556E',
          600: '#606E88',
          500: '#7E8CA6',
          400: '#9DA8BC',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC',
        },
        indigo: {
          950: '#541A2E',
          900: '#384358',
          800: '#242F49',
          700: '#B51A2B',
          600: '#FFA586',
          500: '#FFA586',
          400: '#FFB79D',
          300: '#FFC8B4',
          200: '#FFE0D5',
          100: '#FFF0EA',
        },
      },
      fontFamily: {
        display: ['Okine', 'MADE Okine Sans', 'Unbounded', 'Syne', 'Red Hat Display', 'sans-serif'],
        sans: ['Arint', 'Sora', 'Outfit', 'Lexend', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
