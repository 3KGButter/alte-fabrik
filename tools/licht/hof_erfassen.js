/* Licht-Werkstatt, Werkshof: zeichnet den Hof einmal mit Zwischenständen (Ebenen) und speichert sie als PNG.
   Läuft auf einer gepatchten Kopie von scene.js (nur hier im Werkzeug, das Spiel bleibt unverändert).
   Weggelassen: Figuren, Fahrzeuge, Katze, Mecha, Tiere, Boote, Partikel, Glühwürmchen, altes Lichtsystem. Wetter: klar.
   Dateinamen: S_ = ganze Szene (scene), L_ = Ebene (layer, wird über die letzte Szene gelegt), C_ = fertiges Bild mit Wasser.
   Aufruf: NODE_PATH=$(npm root -g) node tools/licht/hof_erfassen.js 0.45 */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOM = 'hof', T = process.argv[2] ? +process.argv[2] : .45;
const ROOT = path.join(__dirname, '..', '..', 'game3'), OUT = path.join(__dirname, 'werkshof', 'erfasst'); fs.mkdirSync(OUT, { recursive: true });
const C = (k, n) => `CAPF(${JSON.stringify(k + '_' + n)});`;
const PATCH = [
  ['function yard(ctx, st, t, time, dt) {', 'a', `\n    const CAPF = (nm) => { if (!window.CAPON) return; const c = document.createElement('canvas'); c.width = W; c.height = H; const g2 = c.getContext('2d'); const K = nm[0];
      g2.drawImage(K === 'S' ? scene : K === 'L' ? layer : ctx.canvas, 0, 0); if (K === 'L') tint(g2, W, H, k.tint); window.CAPL.push([nm, c.toDataURL()]); };
    if (window.CAPON) window.CAPL = []; if (window.CAPTIME !== undefined) { time = window.CAPTIME; dt = 0; }`],
  ['const bd = backdrop(sc, k, G + 2, time, t)', 'b', 'if (window.CAPON) sc.clearRect(0, 0, W, H);'],
  ['const flash = ART.wetterHimmel(sc, k, wx, G + 2, time);', 'a', C('S', 'himmel')],
  ['{   // Geräusche im Werkshof', 'b', C('S', 'gelaende')],
  ["const order = ['tor', 'pfoertner'", 'b', C('L', 'baeume_hinten')],
  ['if (st.golem) {', 'b', C('L', 'gebaeude')],
  ['// ---- Hof: feste Ausstattung ----', 'b', C('L', 'golem')],
  ['D.sort((a, b) => a.y - b.y).forEach(d => d.f());', 'a', C('L', 'hof')],
  ['sc.drawImage(layer, 0, 0);', 'a', C('S', 'szene')],
  ['lilies(ctx, time, k);', 'a', C('C', 'wasser')],
  ['{   // Entenfamilie', 'b', C('C', 'nebel')],
  ['tinted(ctx, PIER, PX - 6, WATER - 3, n * .5);', 'a', C('C', 'steg')],
  ['// Hinweise: Ausrufezeichen', 'b', C('C', 'gesamt') + ' if (window.CAPON && !window.CAPFIG) window.CAPLAMPS = L.map(l => ({ x: l.x, y: l.y, w: l.w, h: l.h, c: l.c, fire: !!l.fire, a: l.a, pool: !!l.pool }));' + ' if (window.CAPON) { window.CAPON = false; window.CAPDONE = true; }'],
];
const LEER = '!(window.CAPON && !window.CAPFIG)';   // beim Erfassen ohne Figuren und Bewegtes
const REPL = [
  ['add(G + 5, () => { WORKERS.draw', `add(G + 5, () => { if (${LEER}) WORKERS.draw`],
  ['add(ART.PROM + 5, () => WORKERS.draw(', `add(ART.PROM + 5, () => ${LEER} && WORKERS.draw(`],
  ["for (const a of c2) if (a.act === 'pond' && a.st === 'act') {", `for (const a of c2) if (a.act === 'pond' && a.st === 'act' && ${LEER}) {`],
  ['if (st.owned.stapler) {', `if (st.owned.stapler && ${LEER}) {`],
  ['if (st.owned.katze) {', `if (st.owned.katze && ${LEER}) {`],
  ['if (st.truck) {', `if (st.truck && ${LEER}) {`],
  ['if (st.mecha) {', `if (st.mecha && ${LEER}) {`],
  ['if (OW.p > 0)', `if (OW.p > 0 && ${LEER})`],
  ['if (DK.day && d0 < LEN + 30)', `if (DK.day && d0 < LEN + 30 && ${LEER})`],
  ['if (RB.night && u < 110)', `if (RB.night && u < 110 && ${LEER})`],
  ['if (x !== null) { const sx', `if (x !== null && ${LEER}) { const sx`],
  ['if (ANG) {', `if (ANG && ${LEER}) {`],
  ['if (PROMC) for (const a of PROMC)', `if (PROMC && ${LEER}) for (const a of PROMC)`],
  ['for (const p of parts) {', `for (const p of (${LEER} ? parts : [])) {`],
  ['ART.glowPass(sc, L,', `(window.CAPON ? (() => {}) : ART.glowPass)(sc, L,`],
  ['if (n > .4 && rn < .9)', `if (n > .4 && rn < .9 && ${LEER})`],
  ['if (MEI && n > .3)', `if (MEI && n > .3 && !window.CAPON)`],
];
function patched() {
  let s = fs.readFileSync(path.join(ROOT, 'js', 'scene.js'), 'utf8');
  for (const [at, w, txt] of PATCH) { const i = s.indexOf(at); if (i < 0) throw new Error('Stelle fehlt: ' + at);
    s = w === 'a' ? s.slice(0, i + at.length) + ' ' + txt + s.slice(i + at.length) : s.slice(0, i) + txt + ' ' + s.slice(i); }
  for (const [a, b] of REPL) { if (!s.includes(a)) throw new Error('fehlt: ' + a); s = s.replace(a, b); }
  return s;
}
const SRC = patched(), PORT = 9600 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (f.endsWith(path.join('js', 'scene.js'))) { s.writeHead(200, { 'Content-Type': 'text/javascript' }); return s.end(SRC); }
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
  await p.evaluate(t => { const e = document.getElementById('toast'); if (e) e.style.display = 'none'; window.FORCE_T = t; window.FORCE_WX = 'klar'; window.FORCE_WX_NOW = true; }, T);
  await p.evaluate(() => __G.setView('hof')); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.CAPTIME = 1000; }); await p.waitForTimeout(600);   // Zeit anhalten: beide Aufnahmen zeigen denselben Augenblick
  await p.evaluate(() => { window.CAPDONE = false; window.CAPFIG = true; window.CAPON = true; }); await p.waitForFunction(() => window.CAPDONE, null, { timeout: 10000 });
  const FIG = await p.evaluate(() => window.CAPL.find(x => x[0] === 'C_gesamt')[1]); fs.writeFileSync(path.join(OUT, '..', 'mit_figuren.png'), Buffer.from(FIG.split(',')[1], 'base64'));
  await p.evaluate(() => { window.CAPDONE = false; window.CAPFIG = false; window.CAPON = true; }); await p.waitForFunction(() => window.CAPDONE, null, { timeout: 10000 });
  const L = await p.evaluate(() => window.CAPL); fs.writeFileSync(path.join(OUT, '..', 'lampen.json'), JSON.stringify(await p.evaluate(() => window.CAPLAMPS), null, 0));
  L.forEach(([n, url], i) => fs.writeFileSync(path.join(OUT, String(i).padStart(2, '0') + '_' + n + '.png'), Buffer.from(url.split(',')[1], 'base64')));
  await p.screenshot({ path: path.join(OUT, '..', 'spiel.png') });
  console.log(ROOM, L.map(x => x[0]).join(' '), errs.length ? 'FEHLER ' + errs.join(' | ') : 'keine Fehler');
  await b.close(); srv.close(); })();
