/* Figuren-Prüfung: nimmt jeden Raum im echten Spiel über 36 s auf (Maschinen laufen), Bilder alle 0,75 s.
   Aufruf: NODE_PATH=$(npm root -g) node tools/licht/figurencheck.js [raum ...] */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOMS = process.argv.slice(2).length ? process.argv.slice(2) : ['pfoertner', 'blechwerkstatt', 'maschinenhalle', 'prueflabor', 'kraftwerk', 'hof'];
const ROOT = path.join(__dirname, '..', '..', 'game3'), OUT = '/tmp/figcheck', LOG = process.env.LOG; fs.mkdirSync(OUT, { recursive: true });
const PORT = 9700 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } let body = d; if (f.endsWith('config.js')) body = d.toString().replace(/window.API_URL = '[^']*'/, "window.API_URL = ''");
    s.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream' }); s.end(body); }); }).listen(PORT);
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('altefabrik_tut', '1'))); await p.goto(`http://localhost:${PORT}/index.html`);
  await p.fill('#inTag', 'T'); await p.fill('#inPin', '1'); await p.click('#btnLogin'); await p.waitForSelector('#app:not(.hidden)');
  await p.evaluate(async () => { const A = b => MockServer.call(Object.assign({ tag: 'x', pin: 'y' }, b)); await A({ action: 'mockStand', stand: 'alles' }); let r = await A({ action: 'login' });
    await A({ action: 'claim', quests: r.quests.filter(q => q.done).map(q => q.n) }); for (let i = 0; i < 6; i++) await A({ action: 'mockRich' }); await A({ action: 'mockParts' });
    for (const bd of ['pfoertner', 'blechwerkstatt', 'maschinenhalle', 'prueflabor', 'kraftwerk']) { await A({ action: 'build', building: bd }); await A({ action: 'mockBau' }); }
    for (const id of ['notstrom', 'abkant', 'lager', 'fraese', 'dreh', 'gewinde', 'montage']) await A({ action: 'repair', station: id }); });
  await p.click('[data-p="menu"]'); await p.click('[data-act="refresh"]'); await p.waitForTimeout(800);
  await p.evaluate(() => { const e = document.getElementById('toast'); if (e) e.style.display = 'none'; window.FORCE_T = .45; window.FORCE_WX_NOW = true; });
  if (LOG) { await p.evaluate(() => { const g0 = ART.glowPass, b0 = ART.blit; let cur = []; window.FIGLOG = []; ART.blit = function (g, s, cx, b, L, flip) { if (s && s.h >= 28 && s.h <= 40 && s.w <= 40) cur.push([Math.round(cx), Math.round(b), s.w, s.h]); return b0.apply(this, arguments); }; ART.glowPass = function (...a) { window.FIGLOG.push(cur); cur = []; return g0.apply(this, a); }; });
    for (const r of ROOMS) { await p.evaluate(r => { __G.setView(r); }, r); await p.waitForTimeout(1500); await p.evaluate(() => { window.FIGLOG = []; }); await p.waitForTimeout(40000);
      const L = await p.evaluate(() => window.FIGLOG); fs.writeFileSync(`${OUT}/log_${r}.json`, JSON.stringify(L)); console.log(r, L.length, 'Bilder'); }
    await b.close(); srv.close(); return; }
  for (const r of ROOMS) { await p.evaluate(r => __G.setView(r), r); await p.waitForTimeout(1200);
    for (let i = 0; i < 48; i++) { const u = await p.evaluate(() => document.getElementById('game').toDataURL()); fs.writeFileSync(`${OUT}/${r}_${String(i).padStart(2, '0')}.png`, Buffer.from(u.split(',')[1], 'base64')); await p.waitForTimeout(750); } }
  console.log(errs.length ? 'FEHLER ' + errs.join(' | ') : 'keine Fehler'); await b.close(); srv.close(); })();
