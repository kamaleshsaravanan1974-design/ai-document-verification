import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'verifai-api-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            // Forward to internal handler if server is not run separately
            if (req.url === '/api/health' && req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'ok',
                service: 'VerifAI Forensic Core (Vite Dev Server)',
                timestamp: new Date().toISOString()
              }));
              return;
            }

            if (req.url === '/api/analyze' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { ForensicEngine } = await import('./server/services/forensicEngine');
                  const { GeminiService } = await import('./server/services/geminiService');
                  const data = JSON.parse(body);
                  const result = await GeminiService.analyzeDocumentWithGemini(data.docType, data.images);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(result));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: e.message || 'Analysis error' }));
                }
              });
              return;
            }

            if (req.url === '/api/face-match' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { FaceMatchService } = await import('./server/services/faceMatchService');
                  const data = JSON.parse(body);
                  const result = await FaceMatchService.compareFaces(data);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(result));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: e.message || 'Face match error' }));
                }
              });
              return;
            }
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  }
});
