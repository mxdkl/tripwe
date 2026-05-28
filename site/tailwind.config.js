/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'trip-dark': '#0f172a',
        'trip-card': '#1a2235',
        'trip-item': '#1e293b',
        'trip-border': '#334155',
        'trip-blue': '#3b82f6',
        'trip-green': '#10b981',
      },
    },
  },
  plugins: [],
}
