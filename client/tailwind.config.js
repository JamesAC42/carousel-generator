/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nb: {
          bg: '#0d0f12',
          panel: '#111318',
          panelAlt: '#151922',
          text: '#e7e8ee',
          muted: '#a6a8b4',
          border: '#252a34',
          accent: '#22d3ee',
          accent2: '#6ee7b7',
          danger: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}