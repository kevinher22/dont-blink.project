import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => {
  // Local development / preview on localhost (or root domain) uses '/'
  // GitHub Pages production deployment uses '/dont-blink.project/'
  const isGhPages =
    process.env.GITHUB_PAGES === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.DEPLOY_TARGET === 'gh-pages' ||
    mode === 'gh-pages';

  const base = process.env.VITE_BASE_PATH || (
    command === 'serve'
      ? '/'
      : isGhPages
        ? '/dont-blink.project/'
        : '/'
  );

  return {
    base,

    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },

    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',

      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },

    build: {
      sourcemap: false,
      minify: true,
      cssMinify: true,
      assetsInlineLimit: 4096,
    },
  };
});