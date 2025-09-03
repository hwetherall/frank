/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'frank-blue': '#0F4C81',
        'frank-light-blue': '#3B82F6',
        'frank-gray': '#6B7280',
        'frank-light-gray': '#F3F4F6',
        'internal-green': '#10B981',
        'external-blue': '#3B82F6',
      }
    },
  },
  plugins: [],
}
