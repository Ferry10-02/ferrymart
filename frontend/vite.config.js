import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('exceljs')) return 'excel';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('socket.io-client') || id.includes('axios')) return 'realtime';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
      },
    },
  },
});
