import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Reemplazá NOMBRE_DEL_REPO por el nombre real del repo en GitHub
export default defineConfig({
  base: '/DAOMonte/',
  plugins: [react()],
  build: {
    minify: false,
    sourcemap: false,
    outDir: 'dist',
  },
  // Esta sección solo afecta al dev server; GitHub Pages no usa estos headers
  server: {
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'"],
      },
    },
  },
})
