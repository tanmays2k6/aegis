import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Government & Enterprise palette
        gov: {
          navy: '#0A2540',
          blue: '#1E3A8A',
          hover: '#081D33',
          surface: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          slate: '#334155',
          muted: '#64748B',
          dark: '#0F172A',
        },
        status: {
          success: '#059669',
          successBg: '#ECFDF5',
          warning: '#D97706',
          warningBg: '#FFFBEB',
          error: '#DC2626',
          errorBg: '#FEF2F2',
          info: '#2563EB',
          infoBg: '#EFF6FF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
