/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(224 20% 96%)',
        foreground: 'hsl(226 47% 11%)',
        card: 'hsl(0 0% 100%)',
        muted: 'hsl(222 18% 44%)',
        border: 'hsl(224 33% 89%)',
        available: 'hsl(152 75% 39%)',
        sold: 'hsl(344 40% 42%)',
      },
      boxShadow: {
        card: '0 10px 25px rgba(16, 27, 49, 0.08)',
      },
      borderRadius: {
        xl2: '20px',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
