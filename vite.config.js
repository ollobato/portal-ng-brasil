import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function portalCustomPlugin() {
  return {
    name: 'portal-custom-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Redireciona /anuncie e /anuncie/ para a landing page em public/anuncie/index.html
        if (req.url === '/anuncie' || req.url === '/anuncie/') {
          req.url = '/anuncie/index.html';
        } else if (req.url && req.url.startsWith('/anuncie/?')) {
          req.url = req.url.replace('/anuncie/', '/anuncie/index.html');
        }

        // Web scraping de notícias para o gerador de matérias
        if (req.url && req.url.startsWith('/api/scrape?url=')) {
          const targetUrl = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
          try {
            const response = await fetch(targetUrl, {
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
              }
            });
            const html = await response.text();
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
          } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
          }
          return;
        }

        // Simulação / recepção local de leads para desenvolvimento
        if (req.url && req.url.startsWith('/api/leads') && req.method === 'POST') {
          let body = '';
          for await (const chunk of req) body += chunk;
          try {
            const data = JSON.parse(body);
            console.log(' [LOCAL DEV LEAD RECEBIDO]:', data.name, data.company, data.email, data.phone);
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ id: data.requestId || 'mock-local-id', preview: true }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'JSON inválido' }));
          }
          return;
        }

        next();
      });
    }
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    portalCustomPlugin()
  ],
  server: {
    port: 3000,
    host: true
  }
});
