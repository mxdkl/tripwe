/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trip-dark': '#0f172a',    // Background
        'trip-card': '#1a2235',    // Card background
        'trip-item': '#1e293b',    // Item background
        'trip-border': '#334155',  // Border color
        'trip-blue': '#3b82f6',    // Icon/Accent blue
        'trip-green': '#10b981',   // Status green
      }
    },
  },
  plugins: [],
}