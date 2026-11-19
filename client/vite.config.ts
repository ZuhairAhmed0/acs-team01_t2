import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite configuration for Fuel Wallet Frontend.
 * Includes a development proxy for `/api` and `/health` targeting the Express backend (`http://localhost:3000`),
 * ensuring same-origin requests from the browser without requiring CORS changes on the backend.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
