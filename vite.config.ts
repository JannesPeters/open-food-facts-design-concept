import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/__openfoodfacts': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/__openfoodfacts/, '/api/v2'),
      },
    },
  },
})
