/// <reference types="vitest/config" />
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { labStatusForUrl } from './src/lib/extensionLab';

function sendLabStatus(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const status = labStatusForUrl(req.url ?? '');
  if (status == null) {
    next();
    return;
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ lab: true, status }));
}

function extensionLabPlugin(): Plugin {
  return {
    name: 'arc-todo-extension-lab',
    configureServer(server) {
      server.middlewares.use(sendLabStatus);
    },
    configurePreviewServer(server) {
      server.middlewares.use(sendLabStatus);
    },
  };
}

export default defineConfig({
  plugins: [
    extensionLabPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon.svg',
      ],
      manifest: {
        name: 'Arc Todo',
        short_name: 'Arc Todo',
        display: 'standalone',
        start_url: '/board',
        theme_color: '#4862ce',
        background_color: '#0d1119',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'All tasks',
            short_name: 'All tasks',
            url: '/board',
            icons: [
              {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'Knowledge',
            short_name: 'Knowledge',
            url: '/knowledge',
            icons: [
              {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/extension\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        importScripts: ['push-handler.js'],
        // Main Excalidraw/mermaid chunk exceeds Workbox's 2 MiB default.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // injectRegister is false (registerSW lives in main.tsx), so the plugin
        // does not auto-set these. Without them the new SW waits forever and
        // the old precache keeps the previous sidebar (missing Wireframes).
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
