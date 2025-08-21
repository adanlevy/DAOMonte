import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: false, // Desactiva la minificación
    sourcemap: false, // Opcional: desactiva la creación de source maps
  },
  server: {
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'"], // Asegúrate de que solo se permita contenido de orígenes seguros
      },
    },
  },
})
