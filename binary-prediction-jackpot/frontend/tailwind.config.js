/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        yes: '#22c55e',
        no: '#ef4444',
        jackpot: '#f59e0b',
      },
    },
  },
  plugins: [],
}
