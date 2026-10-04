/**
 * Minimal static server for dist/ (used by `npm start` and the end-to-end tests).
 * The launcher fetches live-source.json, so the site must be served over HTTP.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve(process.env.DIST_DIR ?? 'dist');
const port = Number(process.env.PORT ?? 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

http
  .createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    const file = path.join(
      root,
      decodeURIComponent(pathname.endsWith('/') ? `${pathname}index.html` : pathname),
    );
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'content-type': types[path.extname(file)] ?? 'application/octet-stream',
    });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, () =>
    console.log(`Serving ${path.relative(process.cwd(), root) || '.'} at http://localhost:${port}`),
  );
