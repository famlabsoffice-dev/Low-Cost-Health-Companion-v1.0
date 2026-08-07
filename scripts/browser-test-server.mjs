import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 4173);
const server = createServer((_, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end('<!doctype html><html><body>Low Cost Health Companion browser test</body></html>');
});

server.listen(port, '127.0.0.1');
