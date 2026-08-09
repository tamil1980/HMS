import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'https://hms-lijr.onrender.com',
      '/uploads': 'https://hms-lijr.onrender.com',
    },
  },
});
