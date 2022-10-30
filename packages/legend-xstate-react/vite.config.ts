/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],

  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      'legend-xstate': '../legend-xstate',
    },
  },
  build: {
    outDir: resolve(__dirname, '..', 'legend-xstate', 'react', 'dist'),
    lib: {
      entry: resolve(__dirname, 'src', 'index.ts'),
      name: 'LegendXStateReact',
      fileName: 'legend-xstate-react',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['xstate', '@legendapp/state', '@xstate/react', 'react', 'legend-xstate'],
    },
  },
});
