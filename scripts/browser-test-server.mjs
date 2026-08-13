import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';
const root = fileURLToPath(new URL('..', import.meta.url));
const publicRoot = join(root, 'public');
const sourceRoot = join(root, 'src');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function resolveSourcePath(requestUrl) {
  const pathname = new URL(requestUrl, `http://127.0.0.1:${port}`).pathname;
  if (!pathname.startsWith('/src/')) return null;
  const relativePath = pathname.slice('/src/'.length);
  const candidate = normalize(join(sourceRoot, relativePath.endsWith('.ts') ? relativePath : `${relativePath}.ts`));
  return candidate.startsWith(sourceRoot) ? candidate : null;
}

function resolvePublicPath(requestUrl) {
  const pathname = new URL(requestUrl, `http://127.0.0.1:${port}`).pathname;
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = normalize(join(publicRoot, relativePath));
  return candidate.startsWith(publicRoot) ? candidate : null;
}

const server = createServer((request, response) => {
  const sourcePath = resolveSourcePath(request.url ?? '/');
  if (sourcePath && existsSync(sourcePath) && statSync(sourcePath).isFile()) {
    const result = ts.transpileModule(ts.sys.readFile(sourcePath) ?? '', {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        isolatedModules: true,
        sourceMap: false,
      },
      fileName: sourcePath,
    });
    response.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
    response.end(result.outputText);
    return;
  }

  const filePath = resolvePublicPath(request.url ?? '/');
  const fallback = join(publicRoot, 'index.html');
  const resolvedPath = filePath && existsSync(filePath) && statSync(filePath).isFile() ? filePath : fallback;
  const contentType = contentTypes[extname(resolvedPath)] ?? 'application/octet-stream';

  response.writeHead(200, { 'content-type': contentType });
  createReadStream(resolvedPath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Low Cost Health Companion available at http://${host === '0.0.0.0' ? '0.0.0.0' : host}:${port}`);
});
