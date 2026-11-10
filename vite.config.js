import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { handleApiRequest } from './api/handler.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            try {
              await handleApiRequest(req, res);
            } catch (err) {
              console.error('[Vite API Middleware Error]:', err);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
})
