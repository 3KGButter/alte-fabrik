/* Licht-Werkstatt: zeichnet einen Raum einmal mit Zwischenständen (Ebenen) und speichert sie als PNG.
   Läuft auf einer gepatchten Kopie von interior.js (nur hier im Werkzeug, das Spiel bleibt unverändert).
   Figuren, Katze, Partikel und das alte Lampenlicht werden dabei weggelassen.
   Aufruf: NODE_PATH=$(npm root -g) node tools/licht/erfassen.js pfoertner [nacht] */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOM = process.argv[2] || 'pfoertner', T = process.argv[3] ? +process.argv[3] : .45;
const ROOT = path.join(__dirname, '..', '..', 'game3'), OUT = path.join(__dirname, ROOM, 'erfasst'); fs.mkdirSync(OUT, { recursive: true });
const CAP = n => `CAPF(${JSON.stringify(n)}, false);`, CAPS = n => `CAPF(${JSON.stringify(n)}, true);`;
const PATCH = [   // [Stelle, einfügen davor (b) oder danach (a), Text]
  ['function draw(ctx, room, st, t, time, dt) {', 'a', `\n    const CAPF = (nm, s) => { if (!window.CAPON) return; const c = document.createElement('canvas'); c.width = W; c.height = H; const g2 = c.getContext('2d'); g2.drawImage(s ? scene : layer, 0, 0); if (!s) { tint(g2, W, H, k.tint); if (!st.built) { g2.globalCompositeOperation = 'source-atop'; g2.fillStyle = 'rgba(40,30,50,.35)'; g2.fillRect(0, 0, W, H); } } window.CAPL.push([nm, c.toDataURL()]); };\n    if (window.CAPON) window.CAPL = []; if (window.CAPTIME !== undefined) { time = window.CAPTIME; dt = 0; }`],
  ['backdrop(sc, k, FLOOR, time, t);', 'b', 'if (window.CAPON) sc.clearRect(0, 0, W, H);'],
  ['ART.regen(sc, wx, time, dt, n, FLOOR);', 'a', CAPS('himmel')],
  ['lc.drawImage(wall.s.c, -1, -1);', 'a', CAP('wand')],
  ["g => floor(g, k, RM.floor)), 0, 0);", 'a', CAP('boden')],
  ['const anyRun = Object.values', 'b', CAP('grundschatten')],
  ['const ss = id => (st.s && st.s[id])', 'b', CAP('lampen')],
  ['cuckooAt(lc, 14, 84, time);', 'b', CAP('aggregatraum')],
  ["if (st.built && typeof WERKMEISTER !== 'undefined')", 'b', CAP('wandtafeln')],
  ['// Notstromaggregat mit Ausbaustufen', 'b', CAP('moebel')],
  ['// Brückenkran: Laufbahn oben', 'b', CAP('wandteile')],
  ['// Teilelager: Stufe 1 Holzregal', 'b', CAP('kran_spind')],
  ['      // Abkantbank\n', 'b', CAP('lager')],
  ['hallWall(lc, f, d, dl, time, dt);', 'a', CAP('hallenwand')],
  ['{   // Zuführband von hinten', 'b', CAP('wandschilder')],
  ["const fo = blit(lc, f.state === 'broken' ? MILL.broken", 'b', CAP('zufuehrband')],
  ['// Rollenbahn links aus der Maschine', 'b', CAP('fraese')],
  ['{   // Rückwand: Klimaanzeige', 'b', CAP('wandtafel')],
  ['{   // Messplatz: Prüferin', 'b', CAP('rueckwand')],
  ["if (st.built && gw.state !== 'broken') {   // Bediener", 'b', CAP('messplatz')],
  ["const mo = blit(lc, m.state === 'broken' ? ASSY.broken", 'b', CAP('gewinde')],
  ['blit(lc, PIPES, 192, 110); blit(lc, EXT, 22, 129);', 'a', CAP('rohre')],
  ['// Ausfliegen durch das offene Tor', 'b', CAP('hangar')],
  ['// Kran: Laufkatze fährt langsam', 'b', CAP('golem')],
  ['// Energiekapseln, Kabel zur Turbine', 'b', CAP('kran')],
  ['// gekaufte Einrichtung: Wand', 'b', CAP('maschinen')],
  ['if (st.owned && st.owned.katze)', 'b', CAP('deko')],
  ['sc.drawImage(layer, 0, 0);', 'b', CAP('zuletzt')],
  ['sc.drawImage(layer, 0, 0);', 'a', CAPS('gesamt') + ' if (window.CAPON) { window.CAPON = false; window.CAPDONE = true; }'],
];
const LEER = '!(window.CAPON && !window.CAPFIG)';   // beim Erfassen ohne Figuren
const REPL = [["typeof WERKMEISTER !== 'undefined')", `typeof WERKMEISTER !== 'undefined' && ${LEER})`], ['if (nWork) {', `if (nWork && ${LEER}) {`], ['if (st.owned && st.owned.katze)', `if (st.owned && st.owned.katze && ${LEER})`],
  ["if (on) { const Wk = WORKERS.set('big', 5)", `if (on && ${LEER}) { const Wk = WORKERS.set('big', 5)`],
  ["if (st.built && gw.state !== 'broken') {   // Bediener", `if (st.built && gw.state !== 'broken' && ${LEER}) {   // Bediener`],
  ['blit(lc, fr, wx, BASE + 13 + Math.round(Sk.h - Sk.hipY - Sk.thigh - Sk.shin), null, true);', `if (${LEER}) blit(lc, fr, wx, BASE + 13 + Math.round(Sk.h - Sk.hipY - Sk.thigh - Sk.shin), null, true);`],
  ['WORKERS.put(lc, Wa.reach[', `if (${LEER}) WORKERS.put(lc, Wa.reach[`],
  ['WORKERS.put(lc, Wb.reach[', `if (${LEER}) WORKERS.put(lc, Wb.reach[`],
  ['function drawPorter(g, w, vi, time) {', `function drawPorter(g, w, vi, time) { if (!(${LEER})) return;`]];
function patched() {
  let s = fs.readFileSync(path.join(ROOT, 'js', 'interior.js'), 'utf8');
  for (const [at, w, txt] of PATCH) { const i = s.indexOf(at); if (i < 0) throw new Error('Stelle fehlt: ' + at);
    s = w === 'a' ? s.slice(0, i + at.length) + ' ' + txt + s.slice(i + at.length) : s.slice(0, i) + txt + ' ' + s.slice(i); }
  for (const [a, b] of REPL) { if (!s.includes(a)) throw new Error('fehlt: ' + a); s = s.replace(a, b); }
  return s;
}
const SRC = patched(), PORT = 9600 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (f.endsWith(path.join('js', 'interior.js'))) { s.writeHead(200, { 'Content-Type': 'text/javascript' }); return s.end(SRC); }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } let body = d; if (f.endsWith('config.js')) body = d.toString().replace(/window.API_URL = '[^']*'/, "window.API_URL = ''");
    s.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream' }); s.end(body); }); }).listen(PORT);
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('altefabrik_tut', '1'))); await p.goto(`http://localhost:${PORT}/index.html`);
  await p.fill('#inTag', 'T'); await p.fill('#inPin', '1'); await p.click('#btnLogin'); await p.waitForSelector('#app:not(.hidden)');
  await p.evaluate(async (room) => { const A = b => MockServer.call(Object.assign({ tag: 'x', pin: 'y' }, b)); await A({ action: 'mockStand', stand: 'alles' }); let r = await A({ action: 'login' });
    await A({ action: 'claim', quests: r.quests.filter(q => q.done).map(q => q.n) }); for (let i = 0; i < 6; i++) await A({ action: 'mockRich' }); await A({ action: 'mockParts' });
    for (const bd of ['pfoertner', 'blechwerkstatt', 'maschinenhalle', 'prueflabor', 'kraftwerk']) { await A({ action: 'build', building: bd }); await A({ action: 'mockBau' }); }
    for (const id of ['notstrom', 'abkant', 'lager', 'fraese', 'dreh', 'gewinde', 'montage']) await A({ action: 'repair', station: id }); }, ROOM);
  await p.click('[data-p="menu"]'); await p.click('[data-act="refresh"]'); await p.waitForTimeout(800);
  await p.evaluate(t => { const e = document.getElementById('toast'); if (e) e.style.display = 'none'; window.FORCE_T = t; window.FORCE_WX_NOW = true; }, T);
  await p.evaluate(r => __G.setView(r), ROOM); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.CAPTIME = 1000; }); await p.waitForTimeout(600);   // Zeit anhalten: beide Aufnahmen zeigen denselben Augenblick
  await p.evaluate(() => { window.CAPDONE = false; window.CAPFIG = true; window.CAPON = true; }); await p.waitForFunction(() => window.CAPDONE, null, { timeout: 10000 });
  const FIG = await p.evaluate(() => window.CAPL.find(x => x[0] === 'gesamt')[1]); fs.writeFileSync(path.join(OUT, '..', 'mit_figuren.png'), Buffer.from(FIG.split(',')[1], 'base64'));
  await p.evaluate(() => { window.CAPDONE = false; window.CAPFIG = false; window.CAPON = true; }); await p.waitForFunction(() => window.CAPDONE, null, { timeout: 10000 });
  const L = await p.evaluate(() => window.CAPL);
  L.forEach(([n, url], i) => fs.writeFileSync(path.join(OUT, String(i).padStart(2, '0') + '_' + n + '.png'), Buffer.from(url.split(',')[1], 'base64')));
  await p.screenshot({ path: path.join(OUT, '..', 'spiel.png') });
  console.log(ROOM, L.map(x => x[0]).join(' '), errs.length ? 'FEHLER ' + errs.join(' | ') : 'keine Fehler');
  await b.close(); srv.close(); })();
