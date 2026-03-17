import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: '/clotato/',
  server: {
    watch: {
      // inotify doesn't fire across the WSL2/Windows filesystem boundary.
      // Polling detects changes reliably regardless of where the editor runs.
      usePolling: true,
      interval: 300,
    },
  },
  plugins: [
    {
      name: 'playtest-saver',
      configureServer(server) {
        // POST /api/save-playtest — writes a report JSON to playtests/ on disk.
        // Used by both bot mode and ?record=true human sessions so reports from
        // any browser instance land in the same place without copy-paste.
        server.middlewares.use('/api/save-playtest', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end();
            return;
          }
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const report = JSON.parse(body);
              const strategy = report.strategy ?? 'unknown';
              const date = new Date().toISOString().split('T')[0];
              const filename = `${strategy}_${date}.json`;
              const dir = path.join(process.cwd(), 'playtests');
              if (!fs.existsSync(dir)) fs.mkdirSync(dir);
              const filepath = path.join(dir, filename);
              fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
              console.log(`[playtest-saver] Saved ${filename}`);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ saved: filename }));
            } catch (e) {
              res.statusCode = 500;
              res.end(String(e));
            }
          });
        });
      },
    },
  ],
});
