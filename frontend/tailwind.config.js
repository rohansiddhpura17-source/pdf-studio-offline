/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          primary: '#2859D9',
          'primary-hover': '#1E46B2',
          'primary-soft': '#E8EEFC',
          navy: '#17243B',
          bg: '#F6F8FC',
          card: '#FFFFFF',
          border: '#DCE3EF',
          'border-hover': '#BAC7E0',
          muted: '#64748B',
          success: '#15966B',
          warning: '#D97706',
          danger: '#DC2626',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(23, 36, 59, 0.05), 0 1px 2px 0 rgba(23, 36, 59, 0.03)',
        'card': '0 4px 6px -1px rgba(23, 36, 59, 0.06), 0 2px 4px -1px rgba(23, 36, 59, 0.04)',
        'popover': '0 10px 15px -3px rgba(23, 36, 59, 0.08), 0 4px 6px -2px rgba(23, 36, 59, 0.04)',
        'lift': '0 12px 28px -8px rgba(23, 36, 59, 0.16), 0 4px 10px -4px rgba(23, 36, 59, 0.08)',
        'glow': '0 0 0 1px rgba(40, 89, 217, 0.18), 0 8px 30px -6px rgba(40, 89, 217, 0.35)',
        'glow-soft': '0 0 24px -4px rgba(40, 89, 217, 0.28)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'aurora-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(28px, -18px) scale(1.08)' },
          '66%': { transform: 'translate(-20px, 14px) scale(0.96)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.82)' },
        },
        'float-y': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-9px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.4s linear infinite',
        'aurora-drift': 'aurora-drift 16s ease-in-out infinite',
        'soft-pulse': 'soft-pulse 2.2s ease-in-out infinite',
        'float-y': 'float-y 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
