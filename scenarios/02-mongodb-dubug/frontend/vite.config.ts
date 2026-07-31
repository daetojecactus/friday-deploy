import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Собранный бандл отдает сам бэкенд (см. platform.ts -> /app/public), поэтому
// пути относительные и никакого отдельного веб-сервера в проде стенда нет.
//
// `npm run dev` нужен только для локальной правки интерфейса: он поднимает
// Vite на 5173 и проксирует /api в уже запущенный стенд на 8080.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
