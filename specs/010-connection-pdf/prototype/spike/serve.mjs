// Serves dist/ and takes the page's results on POST /results (for Firefox, which has no CDP)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const [, , port = '4181', label = 'firefox'] = process.argv;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/results') {
    let body = ''; req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const results = JSON.parse(body);
      for (const r of results) {
        if (r.pdf) { fs.writeFileSync(`out/${label}-${r.name}.pdf`, Buffer.from(r.pdf, 'base64')); delete r.pdf; }
        for (const k of Object.keys(r)) if (typeof r[k] === 'number') r[k] = Math.round(r[k]);
      }
      fs.writeFileSync(`out/${label}-results.json`, JSON.stringify(results, null, 1));
      res.end('ok'); setTimeout(() => process.exit(0), 100);
    });
    return;
  }
  const file = path.join('dist', req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream'); res.end(data);
  });
}).listen(Number(port), '127.0.0.1');
