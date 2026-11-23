/* Licht-Werkstatt, Ehrenhalle (badgeroom.js, 192x246): zeichnet die Tafel einmal mit Zwischenständen.
   Weggelassen: die alten Lichtkegel der Strahler, Staub im Licht, der Lichtreflex. Stand: alle Gebäude, einige Badges.
   Aufruf: NODE_PATH=$(npm root -g) node tools/licht/ehrenhalle_erfassen.js */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..', 'game3'), OUT = path.join(__dirname, 'ehrenhalle', 'erfasst'); fs.mkdirSync(OUT, { recursive: true });
const CAP = n => ` if (window.CAPON) { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(ctx.canvas, 0, 0); window.CAPL.push([${JSON.stringify(n)}, c.toDataURL()]); }`;
function patched() { let s = fs.readFileSync(path.join(ROOT, 'js', 'badgeroom.js'), 'utf8');
  const P = [['    ctx.imageSmoothingEnabled = false;', 'if (window.CAPON) { window.CAPL = []; time = 3; hover = -1; } ', ''],
    ['    if (titleFn) titleFn(ctx);', '', CAP('S_wand')],
    ['    // Strahler und Lichtkegel nach oben', CAP('S_plaketten') + '\n', ''],
    ['      ctx.globalCompositeOperation = \'lighter\';', 'if (!window.CAPON) {', ''],
    ['      ctx.globalCompositeOperation = \'source-over\'; ctx.globalAlpha = 1;', '}', ''],
    ['    // Staub im Licht', CAP('S_gesamt') + ' if (window.CAPON) { window.CAPON = false; window.CAPDONE = true; return; }\n', '']];
  for (const [at, vor, nach] of P) { const i = s.indexOf(at); if (i < 0) throw new Error('fehlt ' + at); s = s.slice(0, i) + vor + s.slice(i, i + at.length) + nach + s.slice(i + at.length); }
  return s; }
const SRC = patched(), PORT = 9850 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (f.endsWith(path.join('js', 'badgeroom.js'))) { s.writeHead(200, { 'Content-Type': 'text/javascript' }); return s.end(SRC); }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } let body = d; if (f.endsWith('config.js')) body = d.toString().replace(/window.API_URL = '[^']*'/, "window.API_URL = ''");
    s.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream' }); s.end(body); }); }).listen(PORT);
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('altefabrik_tut', '1'))); await p.goto(`http://localhost:${PORT}/index.html`);
  await p.fill('#inTag', 'T'); await p.fill('#inPin', '1'); await p.click('#btnLogin'); await p.waitForSelector('#app:not(.hidden)');
  await p.evaluate(async () => { const A = b => MockServer.call(Object.assign({ tag: 'x', pin: 'y' }, b)); await A({ action: 'mockStand', stand: 'alles' }); let r = await A({ action: 'login' }); await A({ action: 'claim', quests: r.quests.filter(q => q.done).map(q => q.n) }); });
  await p.click('[data-p="menu"]'); await p.click('[data-act="refresh"]'); await p.waitForTimeout(600);
  await p.evaluate(() => window.__G.setMode('badges')); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.CAPDONE = false; window.CAPON = true; }); await p.waitForFunction(() => window.CAPDONE, null, { timeout: 10000 });
  const L = await p.evaluate(() => window.CAPL);
  L.forEach(([n, url], i) => fs.writeFileSync(path.join(OUT, String(i).padStart(2, '0') + '_' + n + '.png'), Buffer.from(url.split(',')[1], 'base64')));
  await (await p.$('#bcv')).screenshot({ path: path.join(OUT, '..', 'spiel.png') });
  console.log('ehrenhalle', L.map(x => x[0]).join(' '), errs.length ? 'FEHLER ' + errs.join(' | ') : 'keine Fehler'); await b.close(); srv.close(); })();
