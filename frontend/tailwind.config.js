/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#0A0D12',
        obsidian: '#101319',
        frost: '#F7FAFC',
        cyber: {
          green: '#37E6A0',
          cyan: '#38D5FF',
          amber: '#F6C667',
          rose: '#FF6B8A'
        }
      },
      boxShadow: {
        glow: '0 0 42px rgba(56, 213, 255, 0.18)',
        panel: '0 20px 80px rgba(6, 9, 14, 0.18)'
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(rgba(148,163,184,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.10) 1px, transparent 1px)',
        'scan-line': 'linear-gradient(90deg, transparent, rgba(56,213,255,.22), transparent)'
      }
    }
  },
  plugins: []
};

