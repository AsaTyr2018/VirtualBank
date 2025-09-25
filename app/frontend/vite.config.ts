import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devPort = Number(process.env.FRONTEND_DEV_PORT ?? process.env.VITE_DEV_PORT ?? 5173);
const previewPort = Number(process.env.FRONTEND_PREVIEW_PORT ?? process.env.VITE_PREVIEW_PORT ?? devPort);

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    host: true
  },
  preview: {
    port: previewPort,
    host: true
  }
});
