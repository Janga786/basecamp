/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces (dark-first; light values handled via CSS vars in index.css)
        ink: {
          950: '#0b0f14',
          900: '#0e141b',
          850: '#121a23',
          800: '#16202b',
          700: '#1e2b39',
          600: '#2a3a4d',
        },
        brand: {
          DEFAULT: '#4f9cff',
          50: '#eaf3ff',
          400: '#6aa9ff',
          500: '#4f9cff',
          600: '#2f7ff0',
          700: '#1f63c6',
        },
        // Domain accents
        lift: '#f2a33c',
        habit: '#3ecf8e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'ring-pop': { '0%': { transform: 'scale(0.9)' }, '60%': { transform: 'scale(1.04)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'ring-pop': 'ring-pop 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
