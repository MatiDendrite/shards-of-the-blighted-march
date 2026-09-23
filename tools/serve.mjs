import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../game');
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.webp':'image/webp' };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  // Also exercise project-subpath hosting without changing game imports.
  pathname = pathname.replace(/^\/preview(?=\/)/, '');
  const target = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(target, (err, bytes) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    const ext=path.extname(target),headers={'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store','Vary':'Accept-Encoding'};
    const acceptsGzip=String(req.headers['accept-encoding']||'').split(',').some(part=>/^\s*gzip\s*(?:;\s*q=(?!0(?:\.0*)?\s*$)[\d.]+)?\s*$/.test(part));
    const send=(body,encoded=false)=>{res.writeHead(200,{...headers,'Content-Length':body.length,...(encoded?{'Content-Encoding':'gzip'}:{})});res.end(body);};
    // Text compresses well; WebP is already compressed. This mirrors ordinary
    // static-host transfer compression without changing the self-contained game.
    if(acceptsGzip&&bytes.length>1024&&['.html','.js','.css','.json','.svg'].includes(ext))gzip(bytes,(error,packed)=>error?send(bytes):send(packed,true));else send(bytes);
  });
}).listen(port, '0.0.0.0', () => console.log(`Shards — http://localhost:${port}`));
