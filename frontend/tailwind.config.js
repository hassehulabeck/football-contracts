/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Warm, high-contrast palette
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',  // primary orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        pitch: '#1a1a18', // near-black background
      },
      fontFamily: {
        // Display/headline font (bold, striking)
        display: ['var(--font-display)', 'Georgia', 'serif'],
        // Body/table font (clean, tabular figures)
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        // Monospaced numbers (scores, credits)
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
