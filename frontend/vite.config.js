import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const normalizeBasePath = (value) => {
  if (!value) return '/';
  if (value === '.' || value === './') return './';
  return value.endsWith('/') ? value : `${value}/`;
};

const basePath = normalizeBasePath(process.env.REACT_APP_BASE_PATH);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: basePath,
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  envPrefix: 'REACT_APP_',
  build: {
    outDir: 'build',
  }
});
