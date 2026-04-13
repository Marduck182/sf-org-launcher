/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Catppuccin Mocha palette
        base:    '#1e1e2e',
        mantle:  '#181825',
        crust:   '#11111b',
        surface0:'#313244',
        surface1:'#45475a',
        surface2:'#585b70',
        overlay0:'#6c7086',
        overlay1:'#7f849c',
        text:    '#cdd6f4',
        subtext1:'#bac2de',
        subtext0:'#a6adc8',
        blue:    '#89b4fa',
        lavender:'#b4befe',
        sapphire:'#74c7ec',
        sky:     '#89dceb',
        teal:    '#94e2d5',
        green:   '#a6e3a1',
        yellow:  '#f9e2af',
        peach:   '#fab387',
        maroon:  '#eba0ac',
        red:     '#f38ba8',
        mauve:   '#cba6f7',
        pink:    '#f5c2e7',
        flamingo:'#f2cdcd',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Cascadia Code', 'Consolas', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-8px) scale(0.98)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.1s ease-out',
        'spin':     'spin 0.8s linear infinite',
      },
    }
  },
  plugins: []
}
