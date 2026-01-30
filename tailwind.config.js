export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Industrial Command Center palette
        command: {
          bg: '#0a0a0b',
          surface: '#111113',
          elevated: '#18181b',
          border: '#27272a',
          muted: '#3f3f46',
        },
        status: {
          online: '#10b981',
          offline: '#ef4444',
          slow: '#f59e0b',
          paused: '#6b7280',
        },
        accent: {
          primary: '#06b6d4',
          secondary: '#8b5cf6',
          glow: 'rgba(6, 182, 212, 0.15)',
        }
      },
      fontFamily: {
        display: ['JetBrains Mono', 'SF Mono', 'monospace'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        glow: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' }
        }
      }
    }
  },
  plugins: []
};
