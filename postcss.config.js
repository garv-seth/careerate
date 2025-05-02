
export default {
  plugins: {
    '@tailwindcss/postcss': {
      // Add content path to ensure all classes are seen by plugin
      content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
      // Explicitly disable purge to keep all utility classes
      purge: false,
      // Add safelist for slate color utilities
      safelist: [
        'border-slate-200',
        'bg-slate-200',
        'bg-slate-800',
        'text-slate-200',
        'text-slate-800'
      ]
    },
    'autoprefixer': {},
  },
}
