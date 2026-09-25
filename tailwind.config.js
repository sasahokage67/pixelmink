/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#fafafa',
        muted: {
          DEFAULT: '#18181b',
          foreground: '#a1a1aa',
        },
        card: {
          DEFAULT: '#111115',
          foreground: '#fafafa',
        },
        border: 'rgba(255, 255, 255, 0.1)',
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Electric Tech Cobalt
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: '#2563eb',
          foreground: '#ffffff',
        },
        cobalt: {
          DEFAULT: '#2563eb',
          glow: 'rgba(37, 99, 235, 0.25)',
        }
      },
      fontFamily: {
        sans: ['var(--font-ibm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-mono)', 'monospace'],
      },
      borderRadius: {
        pill: '9999px',
        card: '14px',
      },
    },
  },
  plugins: [],
}
