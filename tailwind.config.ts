import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        chrome: {
          DEFAULT: '#3b5998',
          secondary: '#6d84b4',
          light: '#dce3ef',
        },
        page: '#e9ebee',
        card: '#ffffff',
        // Override default border color
        border: '#d8dfea',
      },
      fontFamily: {
        sans: ['Tahoma', 'Geneva', 'Verdana', '"Lucida Grande"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.3' }],
        sm: ['12px', { lineHeight: '1.4' }],
        base: ['13px', { lineHeight: '1.5' }],
        lg: ['14px', { lineHeight: '1.5' }],
        xl: ['16px', { lineHeight: '1.4' }],
        '2xl': ['20px', { lineHeight: '1.3' }],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '3px',
        md: '3px',
        lg: '4px',
        full: '9999px',
      },
      boxShadow: {
        card: 'inset 0 1px 0 rgba(255,255,255,0.6)',
        btn: '0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
