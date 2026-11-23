/* Licht-Werkstatt, Leitraum: zeichnet den Hintergrund des Leitstands (leitraum.js) einmal mit Zwischenständen.
   Smartboard-Größe 1920x1080 (4 px je Spielpixel). Ohne Leute. Dazu ein Bild der Tafel ohne Hintergrund (tafel.png).
   Aufruf: NODE_PATH=$(npm root -g) node tools/licht/leitraum_erfassen.js 0.45 */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const T = process.argv[2] ? +process.argv[2] : .45;
const ROOT = path.join(__dirname, '..', '..', 'game3'), OUT = path.join(__dirname, 'leitraum', 'erfasst'); fs.mkdirSync(OUT, { recursive: true });
const CAP = n => ` if (window.CAPON) { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(cv, 0, 0); window.CAPL.push([${JSON.stringify(n)}, c.toDataURL()]); }`;
function patched() { let s = fs.readFileSync(path.join(ROOT, 'js', 'leitraum.js'), 'utf8').replace('const dt = Math.min(.1, last', 'let dt = Math.min(.1, last');
  const P = [['    himmelMalen(t, s, dt);', 'if (window.CAPON) { window.CAPL = []; dt = 0; }', CAP('S_himmel')], ['    g.drawImage(wand, 0, 0);', '', CAP('S_wand')], ['    band(dt);', '', CAP('S_gesamt') + ' if (window.CAPON) { window.CAPON = false; window.CAPDONE = true; window.CAPP = P; }'], ['    leute(dt);', 'if (!window.CAPSTILL)', '']];
  for (const [at, vor, nach] of P) { const i = s.indexOf(at); if (i < 0) throw new Error('fehlt ' + at); s = s.slice(0, i) + vor + s.slice(i, i + at.length) + nach + s.slice(i + at.length); }
  return s; }
const SRC = patched(), PORT = 9800 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (f.endsWith(path.join('js', 'leitraum.js'))) { s.writeHead(200, { 'Content-Type': 'text/javascript' }); return s.end(SRC); }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } let body = d; if (f.endsWith('config.js')) body = d.toString().replace(/window.API_URL = '[^']*'/, "window.API_URL = ''");
    s.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream' }); s.end(body); }); }).listen(PORT);
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.evaluate(() => localStorage.clear()); await p.goto(`http://localhost:${PORT}/index.html`);
  await p.evaluate(t => { window.FORCE_T = t; }, T);
  await p.fill('#inTag', 'Leitstand'); await p.fill('#inPin', '123456'); await p.click('#btnLogin'); await p.waitForSelector('#leit'); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.CAPSTILL = true; }); await p.waitForTimeout(300);
  await p.evaluate(() => { window.CAPDONE = false; window.CAPON = true; }); await p.waitForFunction(() => window.CAPDONE, null, { timeout: 10000 });
  const L = await p.evaluate(() => window.CAPL), P = await p.evaluate(() => window.CAPP);
  L.forEach(([n, url], i) => fs.writeFileSync(path.join(OUT, String(i).padStart(2, '0') + '_' + n + '.png'), Buffer.from(url.split(',')[1], 'base64')));
  await p.screenshot({ path: path.join(OUT, '..', 'spiel.png') });
  await p.evaluate(() => { document.querySelectorAll('canvas.lraum').forEach(c => c.style.visibility = 'hidden'); document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent'; const r = document.getElementById('leit'); if (r) r.style.background = 'transparent'; });
  await p.screenshot({ path: path.join(OUT, '..', 'tafel.png'), omitBackground: true });
  fs.writeFileSync(path.join(OUT, '..', 'massstab.json'), JSON.stringify({ P }));
  console.log('leitraum', L.map(x => x[0]).join(' '), 'P', P, errs.length ? 'FEHLER ' + errs.join(' | ') : 'keine Fehler'); await b.close(); srv.close(); })();
