/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#0a0a0a',
        surface: '#141414',
        border: '#262626',
        primary: '#05d590',
        primaryHover: '#04b077',
        textMain: '#e5e5e5',
        textMuted: '#737373',
      }
    },
  },
  plugins: [],
}
