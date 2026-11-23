const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = '/home/claude/af/game3', OUT = '/tmp/lichtcheck'; fs.mkdirSync(OUT, { recursive: true });
const PORT = 9900 + Math.floor(Math.random() * 90);
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
    for (const id of ['notstrom', 'abkant', 'lager', 'fraese', 'dreh', 'gewinde', 'montage']) await A({ action: 'repair', station: id }); for (let i = 0; i < 8; i++) await A({ action: 'mecha' }); });
  await p.click('[data-p="menu"]'); await p.click('[data-act="refresh"]'); await p.waitForTimeout(800);
  await p.evaluate(() => { const e = document.getElementById('toast'); if (e) e.style.display = 'none'; window.FORCE_WX = 'klar'; window.FORCE_WX_NOW = true; });
  if (process.env.KLANG) { await p.evaluate(async () => { const A = b => MockServer.call(Object.assign({ tag: 'x', pin: 'y' }, b)); for (let i = 0; i < 30; i++) await A({ action: 'mockParts' }); for (let i = 0; i < 6; i++) await A({ action: 'mecha' }); });
    await p.click('[data-p="menu"]'); await p.click('[data-act="refresh"]'); await p.waitForTimeout(800); await p.evaluate(() => { delete window.FORCE_WX; }); await p.evaluate(() => { window.__K = []; window.__MK = 0; const m0 = ART.mechaKlang; ART.mechaKlang = function () { window.__MK++; window.__MP = JSON.stringify(arguments[1]); return m0.apply(this, arguments); }; const p0 = SFX.play; SFX.play = function (n, o) { if (n === 'zisch' || n === 'einfahren') window.__K.push(n); return p0.apply(this, arguments); }; });
    for (const r of ['kraftwerk', 'hof']) { await p.evaluate(r => { window.__K = []; __G.setView(r); }, r); await p.waitForTimeout(+process.env.KLANG);
      console.log(r, await p.evaluate(() => window.__MK + ' ' + window.__MP), JSON.stringify(await p.evaluate(() => window.__K.reduce((a, n) => (a[n] = (a[n] || 0) + 1, a), {})))); }
    console.log(errs.length ? 'FEHLER ' + errs.join(' | ') : 'keine Fehler'); await b.close(); srv.close(); return; }
  if (process.env.SEQ) { await p.evaluate(() => { window.FORCE_T = .97; __G.setView('hof'); }); await p.waitForTimeout(2500);
    for (let i = 0; i < 24; i++) { if (i % 6 === 0) console.log(JSON.stringify(await p.evaluate(() => (window.__LICHTL || []).filter(l => l.move || l.hinten).map(l => [l.x, l.y, l.move ? 'move' : '', l.hinten ? 'hinten' : ''])))); const u = await p.evaluate(() => document.getElementById('game').toDataURL()); fs.writeFileSync(`${OUT}/seq_${String(i).padStart(2, '0')}.png`, Buffer.from(u.split(',')[1], 'base64')); await p.waitForTimeout(250); }
    console.log(errs.length ? 'FEHLER ' + errs.join(' | ') : 'keine Fehler'); await b.close(); srv.close(); return; }
  const rooms = (process.argv[2] || 'pfoertner,blechwerkstatt,maschinenhalle,prueflabor,kraftwerk,hof').split(',');
  for (const r of rooms) { await p.evaluate(r => __G.setView(r), r);
    for (const [n, t] of [['morgen', .22], ['tag', .45], ['abend', .765], ['nacht', .95]]) { await p.evaluate(t => { window.FORCE_T = t; }, t); await p.waitForTimeout(1600);
      const ms = await p.evaluate(() => new Promise(res => { let k = 0, t0 = performance.now(); const f = () => { if (++k < 30) requestAnimationFrame(f); else res((performance.now() - t0) / 30); }; requestAnimationFrame(f); }));
      const u = await p.evaluate(() => document.getElementById('game').toDataURL()); fs.writeFileSync(`${OUT}/${r}_${n}.png`, Buffer.from(u.split(',')[1], 'base64')); console.log(r, n, ms.toFixed(1) + ' ms/Bild'); } }
  await p.evaluate(() => { window.FORCE_T = .95; __G.setView('pfoertner'); __G.setMode('badges'); }); await p.waitForTimeout(1500); await (await p.$('#bcv')).screenshot({ path: OUT + '/ehrenhalle.png' });
  console.log(errs.length ? 'FEHLER ' + errs.join(' | ') : 'keine Fehler'); await b.close(); srv.close(); })();
