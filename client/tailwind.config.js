/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          50:  '#f9f9f9',
          100: '#f0f0f0',
          200: '#d9d9d9',
          300: '#bfbfbf',
          400: '#999999',
          500: '#737373',
          600: '#4d4d4d',
          700: '#333333',
          800: '#1a1a1a',
          900: '#000000',
        }
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(to right, #313131, #1a1a1a, #000000)",
      }
    },
  },
  plugins: [],
}