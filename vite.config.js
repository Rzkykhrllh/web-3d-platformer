import { defineConfig } from 'vite';

export default defineConfig({
  // 3000 is taken by other local work
  server: { port: 4000, strictPort: true }
});
