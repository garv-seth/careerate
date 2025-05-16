/** 
 * @type {import('@tailwindcss/postcss').Config} 
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {
      config: './tailwind.config.ts'
    },
    'autoprefixer': {}
  },
}