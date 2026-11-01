/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        medora: {
          navy: '#0B1220',
          dark: '#070C15',
          slate: {
            800: '#1E293B',
            900: '#0F172A',
            950: '#090E17',
          },
          teal: {
            DEFAULT: '#14B8A6',
            hover: '#0D9488',
            light: '#2DD4BF',
            dark: '#115E59'
          },
          sky: {
            DEFAULT: '#38BDF8',
            hover: '#0284C7',
            light: '#7DD3FC'
          },
          surface: '#111827',
          card: '#161F30',
          border: '#1F293D'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
