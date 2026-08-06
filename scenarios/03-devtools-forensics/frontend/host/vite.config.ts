import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Дашборд ведущего собирается ОТДЕЛЬНО от лендинга и в отдельный каталог: он
// знает все ответы, и ему нечего делать в бандле, который команда всю игру
// изучает в Sources.
//
// `npm run dev` нужен только для локальной правки интерфейса: поднимает Vite на
// 5174 и проксирует /api в уже запущенный дашборд на 9090.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': 'http://localhost:9090',
    },
  },
});
