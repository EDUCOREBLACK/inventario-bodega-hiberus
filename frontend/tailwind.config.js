/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hiberus-blue': '#1A2B5C',
        'hiberus-light': '#0066FF',
        'hiberus-gray': '#F5F6FA',
        'hiberus-text': '#1A1A1A',
        'hiberus-secondary': '#6B7280',
        'hiberus-success': '#10B981',
        'hiberus-danger': '#EF4444',
        'hiberus-warning': '#F59E0B',
      },
    },
  },
  plugins: [],
}
