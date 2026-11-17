/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#111827',       // Rich charcoal black
          charcoal: '#1F2937',   // Deep slate for typography
          muted: '#4B5563',      // Balanced secondary text
          ivory: '#FAF8F5',      // Warm luxury ivory background
          sand: '#F3EFEA',       // Subtle section dividers / pill bgs
          card: '#FFFFFF',       // Clean white card surfaces
          border: '#E7E2DA',     // Soft natural border tone
          accent: {
            DEFAULT: '#D97706',  // Warm amber gold
            hover: '#B45309',    // Deeper amber for hover states
            light: '#FEF3C7',    // Gentle amber highlight
            subtle: '#FFFBEB',   // Background tint
          },
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(17, 24, 39, 0.04), 0 1px 4px -1px rgba(17, 24, 39, 0.02)',
        'soft-md': '0 8px 24px -4px rgba(17, 24, 39, 0.06), 0 4px 12px -2px rgba(17, 24, 39, 0.03)',
        'soft-lg': '0 16px 36px -6px rgba(17, 24, 39, 0.08), 0 6px 16px -3px rgba(17, 24, 39, 0.04)',
      },
    },
  },
  plugins: [],
}
