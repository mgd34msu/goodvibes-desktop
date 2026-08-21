// electron.vite.config.ts
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    main: {
      build: {
        outDir: 'out/main',
        minify: isProduction,
        sourcemap: !isProduction,
        rollupOptions: {
          output: {
            format: 'es',
          },
          external: ['better-sqlite3', 'node-pty'],
        },
      },
      resolve: {
        alias: {
          '@main': resolve(__dirname, 'src/main'),
          '@shared': resolve(__dirname, 'src/shared'),
        },
      },
    },

    preload: {
      build: {
        outDir: 'out/preload',
        minify: isProduction,
        sourcemap: !isProduction,
        // The window runs with sandbox: true, so the emitted bundle must not
        // require anything beyond 'electron'. The externals below are listed
        // defensively; preload code never imports them, so they do not appear
        // in out/preload/index.cjs. Verify with:
        //   grep -oE "require\(\"[^\"]+\"\)" out/preload/index.cjs | sort -u
        rollupOptions: {
          output: {
            format: 'cjs',
            entryFileNames: '[name].cjs',
          },
          external: ['better-sqlite3', 'node-pty'],
        },
      },
      resolve: {
        alias: {
          '@preload': resolve(__dirname, 'src/preload'),
          '@shared': resolve(__dirname, 'src/shared'),
        },
      },
    },

    renderer: {
      root: resolve(__dirname, 'src/renderer'),
      plugins: [
        react(),
        tailwindcss(),
        tsconfigPaths(),
      ],
      build: {
        outDir: resolve(__dirname, 'out/renderer'),
        minify: isProduction ? 'terser' : false,
        sourcemap: !isProduction,
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'src/renderer/index.html'),
          },
          output: {
            manualChunks: isProduction ? {
              'react-vendor': ['react', 'react-dom'],
              'ui-vendor': ['clsx', '@tanstack/react-query', '@tanstack/react-virtual'],
              'zustand': ['zustand'],
              'xterm': ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-search', '@xterm/addon-web-links'],
            } : undefined,
          },
        },
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src/renderer/src'),
          '@components': resolve(__dirname, 'src/renderer/components'),
          '@hooks': resolve(__dirname, 'src/renderer/hooks'),
          '@stores': resolve(__dirname, 'src/renderer/stores'),
          '@shared': resolve(__dirname, 'src/shared'),
        },
      },
      server: {
        port: 5173,
      },
      optimizeDeps: {
        exclude: ['electron'],
        include: [
          'react',
          'react-dom',
          'clsx',
          'zustand',
          '@tanstack/react-query',
          '@tanstack/react-virtual',
        ],
      },
    },
  };
});
