/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        'brand-dark': '#0B0F1A',
        'brand-purple': '#7C3AED',
        'brand-light-purple': '#A855F7',
        'brand-accent': '#8B5CF6',
        'brand-input': 'rgba(15, 23, 42, 0.65)',
        'brand-container': 'rgba(255, 255, 255, 0.06)',
        'brand-border': 'rgba(255, 255, 255, 0.08)',
      },
      boxShadow: {
        'purple-glow': '0 0 25px rgba(124, 58, 237, 0.55)',
        'purple-glow-sm': '0 0 12px rgba(124, 58, 237, 0.45)',
      },
    },
  },
  plugins: [],
};
