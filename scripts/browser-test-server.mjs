import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 4173);
const publicRoot = join(fileURLToPath(new URL('..', import.meta.url)), 'public');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function resolvePublicPath(requestUrl) {
  const pathname = new URL(requestUrl, `http://127.0.0.1:${port}`).pathname;
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = normalize(join(publicRoot, relativePath));
  return candidate.startsWith(publicRoot) ? candidate : null;
}

const server = createServer((request, response) => {
  const filePath = resolvePublicPath(request.url ?? '/');
  const fallback = join(publicRoot, 'index.html');
  const resolvedPath = filePath && existsSync(filePath) && statSync(filePath).isFile() ? filePath : fallback;
  const contentType = contentTypes[extname(resolvedPath)] ?? 'application/octet-stream';

  response.writeHead(200, { 'content-type': contentType });
  createReadStream(resolvedPath).pipe(response);
});

server.listen(port, '127.0.0.1');
