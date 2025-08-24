// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Project Page en https://TUUSUARIO.github.io/DAOMonte/
export default defineConfig({
  base: '/DAOMonte/',          // ← dejalo así para GitHub Pages
  plugins: [react()],
  build: {
    outDir: 'dist',
    minify: false,
    sourcemap: false,
  },
  // Esta sección solo aplica al dev server local
  server: {
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'"],
      },
    },
  },
})
