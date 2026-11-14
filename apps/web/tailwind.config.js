/** ডেমো HTML এর টোকেন হুবহু */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#09283c',
        blue: { DEFAULT: '#1d5b80', 2: '#3e86ad' },
        cyan: { DEFAULT: '#79e4e6' },
        mint: '#6bd5c9',
        ink: '#16384c',
        muted: '#7894a5',
        surface: '#f5fbff',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', '"Hind Siliguri"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        vybe: '0 18px 55px rgba(3,28,45,.24)',
      },
    },
  },
  plugins: [],
};
