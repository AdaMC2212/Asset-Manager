
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'Manrope', 'sans-serif'],
        body: ['var(--font-body)', 'Manrope', 'sans-serif'],
        display: ['var(--font-body)', 'Manrope', 'sans-serif'],
      },
      borderRadius: { xl: '6px', '2xl': '8px', '3xl': '8px' },
      colors: {
        slate: {
          100: '#f3f4f5', 200: '#dfe2e6', 300: '#c2c7ce',
          400: '#a5adb8', 500: '#a5adb8', 600: '#737c88',
          700: '#525962', 800: '#363a40', 850: '#292d32',
          900: '#1f2226', 950: '#141618',
        },
        indigo: { 300: '#9abaff', 400: '#7ca6ff', 500: '#5279ee', 600: '#4169e1', 700: '#365bd0' },
        emerald: { 300: '#6ed4a6', 400: '#6ed4a6' },
        rose: { 300: '#ff969c', 400: '#ff969c' },
        cyan: { 100: '#d0e7ff', 200: '#a9cdf5', 300: '#7ca6ff', 400: '#7ca6ff', 500: '#5279ee', 600: '#4169e1' },
      }
    },
  },
  plugins: [],
};
