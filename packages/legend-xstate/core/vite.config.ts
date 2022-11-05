/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import { resolve } from 'path';
const entry = resolve(__dirname, 'src', 'index.ts');
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(__dirname, 'dist'),
    lib: {
      entry: entry,
      name: 'LegendXState',
      fileName: 'legend-xstate',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['xstate', '@legendapp/state'],
    },
  },
});
