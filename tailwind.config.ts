import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF8F6',
        primary: {
          DEFAULT: '#5B3A6D',
          hover: '#4A2F59',
          light: '#F4EEF7',
        },
        secondary: {
          DEFAULT: '#8A5A9A',
          hover: '#734882',
        },
        accent: {
          DEFAULT: '#E8B4C8',
          light: '#FAF0F4',
        },
        text: {
          DEFAULT: '#17151A',
          muted: '#68626D',
        },
        brandSuccess: '#2D8C6A',
        brandDanger: '#C94B5B',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(91, 58, 109, 0.06), 0 2px 6px -1px rgba(91, 58, 109, 0.04)',
        card: '0 10px 30px -5px rgba(91, 58, 109, 0.08), 0 4px 10px -2px rgba(91, 58, 109, 0.04)',
        hover: '0 20px 40px -10px rgba(91, 58, 109, 0.12), 0 8px 16px -4px rgba(91, 58, 109, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
