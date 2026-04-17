
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/tts': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: () => {
          const apiKey = process.env.VITE_GEMINI_API_KEY;
          return `/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`;
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
