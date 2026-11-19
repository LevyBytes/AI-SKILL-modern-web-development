// Portable adaptation of GoogleChrome Modern Web Guidance target-server.ts.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream';

export interface TargetServer {
  url: string;
  stop: () => Promise<void>;
}
export type StartedTargetServer = TargetServer;
const media: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
export function containedFile(root: string, file: string) {
  const real = fs.realpathSync(file);
  const rel = path.relative(root, real);
  if (
    !rel ||
    path.isAbsolute(rel) ||
    rel === '..' ||
    rel.startsWith('..' + path.sep) ||
    !fs.statSync(real).isFile()
  )
    throw Error('File is outside target or is not a regular file');
  return real;
}
export async function startTargetServer(
  targetDir: string,
  options: { targetFile?: string } = {},
): Promise<TargetServer> {
  const root = fs.realpathSync(targetDir);
  const entry = containedFile(root, path.resolve(root, options.targetFile ?? 'index.html'));
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const address = server.address();
      if (
        !address ||
        typeof address === 'string' ||
        req.headers.host !== `127.0.0.1:` + address.port
      ) {
        res.writeHead(403).end();
        return;
      }
      const route = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
      const parts = route.split('/').filter(Boolean);
      if (parts.some((p) => p === '..' || p.startsWith('.') || /[\\:\0]/.test(p))) {
        res.writeHead(403).end();
        return;
      }
      const file = containedFile(
        root,
        parts.length
          ? path.join(root, ...parts, ...(route.endsWith('/') ? ['index.html'] : []))
          : entry,
      );
      res.setHeader(
        'Content-Type',
        media[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      );
      if (req.method === 'HEAD') res.end();
      else pipeline(fs.createReadStream(file), res, () => {});
    } catch {
      if (!res.headersSent) res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', fail);
      ok();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Loopback listener failed');
  const url =
    'http://127.0.0.1:' +
    address.port +
    '/' +
    path.relative(root, entry).split(path.sep).map(encodeURIComponent).join('/');
  let closed: Promise<void> | undefined;
  return {
    url,
    stop() {
      return (closed ??= new Promise<void>((ok, fail) => {
        server.close((err) => (err ? fail(err) : ok()));
        server.closeAllConnections();
      }));
    },
  };
}
export function localURL(raw: string) {
  const url = new URL(raw);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw Error('Expected an HTTP(S) loopback URL');
  return url.href;
}
