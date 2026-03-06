/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a5b8fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          900: '#0f0f1a',
          800: '#161625',
          700: '#1e1e33',
          600: '#252540',
          500: '#2e2e50',
        },
        accent: {
          green:  '#10b981',
          yellow: '#f59e0b',
          red:    '#ef4444',
          blue:   '#3b82f6',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow:    '0 0 20px rgba(99,102,241,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
      },
      animation: {
        'slide-in':  'slideIn 0.2s ease-out',
        'fade-in':   'fadeIn 0.15s ease-out',
        'pulse-soft':'pulseSoft 2s infinite',
      },
      keyframes: {
        slideIn:    { '0%': { transform: 'translateY(-8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:     { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        pulseSoft:  { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
}
