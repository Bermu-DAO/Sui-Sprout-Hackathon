import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Anthropic-inspired palette
        // Warm/Stone background tones
        canvas: {
          default: '#FBF9F6', // Lighter cream/off-white from image
          subtle: '#F3F1F0',  // Slightly darker for separation
          sand: '#EAE4DC',    // The beige block color
          sage: '#C8D8D5',    // The green block color
          slate: '#DFE3E8',   // Blue-grey for tech sections
          rose: '#F4E4E6',    // Soft pink for statistics
        },
        // Text colors
        ink: {
          900: '#191919', // Almost black
          700: '#404040', // Dark grey
          500: '#6B6B6B', // Medium grey
          300: '#A3A3A3', // Light grey for borders/subtle text
        },
        // Component backgrounds
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#FAFAFA',
          active: '#F5F5F5',
          sand: '#DCD6CE', // Darker sand for cards inside beige block
          slate: '#CDD5DD', // Darker slate for cards
          rose: '#EDD5D8',  // Darker rose for cards
        },
        // Functional colors
        accent: {
          primary: '#D97757', // Burnt orange/terracotta
          secondary: '#E6E4DF',
        },
      },
      fontFamily: {
        // Serif for headings (resembling Tiempos/Merriweather)
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        // Clean sans for UI/Body (resembling Inter/Favorit)
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)', 
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
};

export default config;
