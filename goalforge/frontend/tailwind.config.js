/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f5f3',
          100: '#d9e7e2',
          200: '#b6d0c7',
          300: '#8eb3a6',
          400: '#689688',
          500: '#4e7b6d',
          600: '#3e6258',
          700: '#345049',
          800: '#2b413c',
          900: '#253632',
          950: '#131e1c',
        },
        surface: {
          50: '#ffffff',
          100: '#f2efe8',
          200: '#e3dfd3',
          300: '#d0c8b6',
          400: '#a39f96',
          500: '#6b6d76',
          600: '#4a4d56',
          700: '#323640',
          800: '#181c24',
          900: '#11131a',
          950: '#080a0e',
        },
        success: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
        warning: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        danger:  { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.2s ease-in-out',
        'slide-in':   'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
