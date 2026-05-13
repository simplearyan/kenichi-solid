/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: 'var(--bg-background)',
        surface: 'var(--bg-surface)',
        surfaceHover: 'var(--bg-surface-hover)',
        border: 'var(--border-color)',
        borderLight: 'var(--border-light)',
        primary: 'var(--color-primary)',
        primaryHover: 'var(--color-primary-hover)',
        textMain: 'var(--text-main)',
        textMuted: 'var(--text-muted)',
      }
    },
  },
  plugins: [],
}
