import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { dirname } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      // When true, it will open the stats in the browser
      open: false,
      // Options: 'sunburst', 'treemap', 'network', 'raw-data', 'list', 'flamegraph' (default: 'treemap')
      template: 'treemap',
    }),
  ],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
      {
        find: '@shared',
        replacement: fileURLToPath(new URL('../lib', import.meta.url)),
      },
    ],
  },
  build: {
    chunkSizeWarningLimit: 600, // 'apexcharts' is larger than the default 500kB limit
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          tailwind: ['tailwindcss', 'tailwind-merge'],
          ethers: ['ethers'],
          shadcn: [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-tooltip',
            'lucide-react',
            'sonner',
            'next-themes',
            'class-variance-authority',
            'react-jazzicon',
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
