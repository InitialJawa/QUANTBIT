import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
    build: {
      // Raise warning limit; actual size can be larger if acceptable
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            // Split heavy libraries into separate chunks
            react: ['react', 'react-dom'],
            recharts: ['recharts'],
            tailwind: ['tailwindcss'],
          },
        },
      },
    },
  };
});
