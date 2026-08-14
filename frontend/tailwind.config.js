/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5', // Indigo
          hover: '#4338CA',
          light: '#6366F1'
        },
        success: {
          DEFAULT: '#22C55E', // Green for Clock In
          hover: '#16A34A',
          light: '#4ADE80'
        },
        warning: {
          DEFAULT: '#EAB308', // Yellow for Break
          hover: '#CA8A04',
          light: '#FACC15'
        },
        danger: {
          DEFAULT: '#EF4444', // Red for Clock Out
          hover: '#DC2626',
          light: '#F87171'
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0B0F17'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
