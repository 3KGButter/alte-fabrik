const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = '/home/claude/af/game3', PORT = 9700 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } let body = d; if (f.endsWith('config.js')) body = d.toString().replace(/window.API_URL = '[^']*'/, "window.API_URL = ''");
    s.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream' }); s.end(body); }); }).listen(PORT);
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.evaluate(() => localStorage.clear()); await p.goto(`http://localhost:${PORT}/index.html`);
  await p.fill('#inTag', 'Leitstand'); await p.fill('#inPin', '123456'); await p.click('#btnLogin'); await p.waitForSelector('#leit'); await p.waitForTimeout(2000);
  for (const [n, t] of [['abend', .765], ['nacht', .95]]) { await p.evaluate(t => { window.FORCE_T = t; }, t); await p.waitForTimeout(1500); await p.screenshot({ path: `/tmp/lichtcheck/leit_${n}.png` }); }
  console.log(errs.length ? 'FEHLER ' + errs.join(' | ') : 'keine Fehler'); await b.close(); srv.close(); })();
