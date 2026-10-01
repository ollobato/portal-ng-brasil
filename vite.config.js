import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function scraperPlugin() {
  return {
    name: 'scraper-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
    scraperPlugin()
  ],
  server: {
    port: 3000,
    host: true
  }
});
