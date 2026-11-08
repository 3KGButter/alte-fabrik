// Innenansichten der fünf Gebäude mit ihren Maschinen (kaputt / aus / läuft)
'use strict';
const INNER = (() => {
  const { W, H, R, mk, mix, hx, rgb, blit, skyAt, tint, glow, backdrop, parts, puff, stepParts, Grid, fill, brickWall, corrugated, sh } = ART;
  const FLOOR = 136, BASE = FLOOR + 40, CEIL_PF = 46, CEIL_LAB = 18;
  const scene = mk(W, H), sc = scene.getContext('2d');
  const layer = mk(W, H), lc = layer.getContext('2d');
  [sc, lc].forEach(g => g.imageSmoothingEnabled = false);
  const S = rows => ART.buildSprite(rows);
  const G2S = g => ART.buildSprite(g.rows());

  // kaputt: Petrol/Gold -> Grau/Rost, Lampen aus, Spinnweben
  const BROKEN_MAP = { O: 'g', P: 'h', Q: 'i', E: 'C', F: 'D', q: 'g', u: 'g', U: 'a', W: 'C', V: 'C', A: 'i', B: 'j', z: 'h', y: 'g' };
  function brokenOf(g, seed) {
    const b = Grid(g.w, g.h), r = ART.rng(seed || 3);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.a[y][x]; b.a[y][x] = BROKEN_MAP[c] || c; }
    for (let k = 0; k < 7; k++) { const x = Math.floor(r() * g.w), y = Math.floor(r() * g.h); if (b.get(x, y) !== '.') { b.set(x, y, 'C'); if (b.get(x + 1, y) !== '.') b.set(x + 1, y, 'D'); } }
    return b;
  }
  const trio = (g, seed) => ({ ok: G2S(g), broken: G2S(brokenOf(g, seed)) });

  // ---------- Wände ----------
  function archWall(material) {
    const g = Grid(W, FLOOR), wins = [];
    if (material === 'brick') brickWall(g, 0, 18, W, FLOOR - 18); else fill(g, 0, 18, W, FLOOR - 18, 'plaster', 2);
    for (let k = 0; k < 5; k++) {
      const x0 = 18 + k * 76, w = 34, y0 = 38, h = 52;
      for (let y = y0 - 10; y < y0 + h; y++) for (let x = x0 - 2; x < x0 + w + 2; x++) {
        const dy = y - y0, cx = x - (x0 + w / 2);
        const inArch = dy >= 0 || (cx * cx) / ((w / 2 + 2) * (w / 2 + 2)) + (dy * dy) / 100 <= 1;
        if (!inArch) continue;
        const inner = dy >= 0 ? (x >= x0 && x < x0 + w && y < y0 + h - 2) : (cx * cx) / ((w / 2) * (w / 2)) + (dy * dy) / 64 <= 1;
        if (!inner) g.set(x, y, 'j'); else if ((x - x0) % 9 === 0 || (y - y0) % 10 === 0 && dy >= 0) g.set(x, y, 'T'); else g.set(x, y, '.');
      }
      g.rect(x0 - 3, y0 + h - 2, w + 6, 2, 'l'); wins.push({ x: x0, y: y0 - 8, w, h: h + 6 });
    }
    roofTruss(g); plinth(g, 'h');
    return { s: G2S(g), wins };
  }
  function roofTruss(g) {
    g.rect(0, 0, W, 14, 'a');
    for (let x = 0; x < W; x++) { g.set(x, 14, 'b'); g.set(x, 15, 'c'); g.set(x, 16, 'b'); g.set(x, 17, 'a'); }
    for (let k = 0; k < 6; k++) { const cx = 32 + k * 64; for (let i = -30; i <= 30; i++) { const y = 14 - Math.round(12 - Math.abs(i) * 12 / 30); g.set(cx + i, y, 'c'); g.set(cx + i, y + 1, 'b'); } for (let y = 2; y < 14; y++) g.set(cx, y, 'c'); }
  }
  function plinth(g, c) { g.rect(0, FLOOR - 6, W, 6, c); g.rect(0, FLOOR - 6, W, 1, 'i'); }
  function tealWall() { // Maschinenhalle: Wellblech innen, Stahlstützen, Fensterband, Sheds
    const g = Grid(W, FLOOR), wins = [];
    g.rect(0, 0, W, 20, 'T');
    for (let k = 0; k < 8; k++) { const x0 = k * 48; for (let j = 0; j < 16; j++) { const len = Math.round((j + 1) / 16 * 40); for (let i = 0; i < len; i++) g.set(x0 + 44 - len + i, 2 + j, sh('metal', 1)); g.set(x0 + 44, 2 + j, '.'); g.set(x0 + 45, 2 + j, '.'); g.set(x0 + 46, 2 + j, 'g'); } }
    g.rect(0, 18, W, 2, 'g');
    // ruhige Blechfläche: nur angedeutete Rillen, wenige Stützen
    g.rect(0, 20, W, FLOOR - 20, (i, j) => (j < 2 ? 'Q' : i % 6 === 0 ? 'Q' : i % 6 === 5 ? 'O' : 'P'));   // Rippen: Lichtkante links, Schatten rechts
    for (let x = 6; x < W; x += 96) { g.rect(x, 20, 3, FLOOR - 20, 'P'); g.rect(x, 20, 1, FLOOR - 20, 'Q'); g.rect(x + 3, 20, 1, FLOOR - 20, 'O'); }
    for (let x = 0; x < W; x++) { if (x % 48 < 12) continue; for (let y = 34; y < 58; y++) g.set(x, y, (x % 12 === 0 || y === 46) ? 'T' : '.'); }
    g.rect(0, 33, W, 1, 'g'); g.rect(0, 58, W, 2, 'l');
    for (let x = 0; x < W; x += 48) wins.push({ x: x + 12, y: 34, w: 36, h: 24 });
    plinth(g, 'O');
    return { s: G2S(g), wins };
  }
  function labWall() { // Prüflabor: Stockwerk im Schnitt (oben Geschossdecke, darüber das nächste Stockwerk), Putz, Fliesen, Fenster
    const g = Grid(W, FLOOR), wins = [], C = CEIL_LAB;
    // ganz oben: Boden des Stockwerks darüber (Linoleum, Tisch- und Stuhlbeine), dann die Betondecke im Schnitt
    g.rect(0, 0, W, 3, 'h'); g.rect(0, 3, W, 1, 'g');   // Estrich des Stockwerks darüber
    g.rect(0, 4, W, C - 6, 'i'); for (let y = 5; y < C - 2; y++) for (let x = (y * 3) % 7; x < W; x += 7) g.set(x, y, 'h');   // Beton, schraffiert
    g.rect(0, 4, W, 1, 'j'); g.rect(0, C - 2, W, 1, 'h'); g.rect(0, C - 1, W, 1, 'g');
    for (const x0 of [44, 140, 236, 332]) { g.rect(x0, C - 1, 32, 2, 'J'); g.rect(x0, C + 1, 32, 1, 'I'); }   // flache Deckenleuchten
    fill(g, 0, C, W, 92 - C, 'plaster', 2);
    g.rect(0, C + 3, W, 2, 'h'); g.rect(0, C + 3, W, 1, 'j'); for (let x = 0; x < W; x += 3) g.set(x, C + 2, (x / 3) % 3 === 0 ? 'u' : (x / 3) % 3 === 1 ? 'z' : 'X');   // Kabeltrasse direkt unter der Decke
    g.rect(0, C + 7, W, 4, 'Y'); g.rect(0, C + 7, W, 1, 'Z'); g.rect(0, C + 10, W, 1, 'X'); for (let x = 30; x < W; x += 64) g.rect(x, C + 5, 2, 6, 'X');   // Lüftungsrohr
    g.rect(0, 92, W, FLOOR - 92, (i, j) => (i % 8 === 0 || j % 8 === 0) ? 'j' : (((i >> 3) + (j >> 3)) % 2 ? 'B' : 'l'));
    g.rect(0, 91, W, 1, 'i');
    for (let k = 0; k < 5; k++) { const x0 = 22 + k * 76, w = 34, y0 = 44, h = 34;   // Fenster mit Fensterbank, deutlich unter der Trasse
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g.set(x, y, (x === x0 + 17 || y === y0 + 12) ? 'l' : '.');
      g.rect(x0 - 2, y0 - 2, w + 4, 2, 'l'); g.rect(x0 - 3, y0 + h, w + 6, 2, 'j'); g.rect(x0 - 3, y0 + h + 2, w + 6, 1, 'h'); for (let y = y0 - 2; y < y0 + h; y++) { g.set(x0 - 2, y, 'l'); g.set(x0 + w + 1, y, 'i'); }
      wins.push({ x: x0, y: y0, w, h }); }
    plinth(g, 'i');
    return { s: G2S(g), wins };
  }
  function officeWall() { // Pförtnerhaus: einstöckig, niedrige Holzdecke, Putz, Holzvertäfelung, breites Fenster
    const g = Grid(W, FLOOR), wins = [];
    // Holzdecke von unten gesehen: Bretter laufen zum Fluchtpunkt, Querbalken werden nach hinten dünner
    g.rect(0, 0, W, CEIL_PF, (i, j) => j > CEIL_PF - 14 ? 'c' : j > CEIL_PF - 30 ? 'b' : 'a');
    for (let x = -400; x < W + 400; x += 18) { const vx = 192, vy = -150; for (let y = 0; y < CEIL_PF; y++) { const t = (CEIL_PF - y) / (CEIL_PF - vy); g.set(Math.round(x + (vx - x) * t), y, 'a'); } }
    [[CEIL_PF - 4, 3], [CEIL_PF - 15, 2], [CEIL_PF - 25, 2], [CEIL_PF - 33, 1], [CEIL_PF - 39, 1]].forEach(([y, th]) => { g.rect(0, y, W, th, 'd'); g.rect(0, y + th, W, 1, 'a'); g.rect(0, y, W, 1, 'e'); });
    g.rect(0, CEIL_PF, W, 2, 'd'); g.rect(0, CEIL_PF + 2, W, 1, 'e'); g.rect(0, CEIL_PF + 3, W, 1, 'b');
    fill(g, 0, CEIL_PF + 4, W, 100 - CEIL_PF - 4, 'plaster', 1);
    g.rect(0, 100, W, FLOOR - 100, (i, j) => (i % 12 === 0) ? 'c' : (j === 0 ? 'e' : j === 1 ? 'c' : 'd'));
    const x0 = 108, w = 52, y0 = 64, h = 32;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g.set(x, y, (x - x0) % 26 === 0 || y === y0 + 13 ? 'b' : '.');
    g.rect(x0 - 3, y0 - 3, w + 6, 3, 'c'); g.rect(x0 - 4, y0 + h, w + 8, 3, 'e'); g.rect(x0 - 4, y0 + h + 3, w + 8, 1, 'b'); for (let y = y0 - 3; y < y0 + h; y++) { g.set(x0 - 3, y, 'c'); g.set(x0 + w + 2, y, 'b'); }
    wins.push({ x: x0, y: y0, w, h });
    plinth(g, 'b');
    return { s: G2S(g), wins };
  }
  // Kraftwerk: Ziegel mit hellen Pfeilern, Betonbändern, hohen Stahlfenstern paarweise und Stahlfachwerk mit Oberlicht
  function powerWall() {
    const g = Grid(W, FLOOR), wins = [];
    brickWall(g, 0, 22, W, FLOOR - 22);
    // Dach: Stahlfachwerk (Diagonalen) und Oberlichtband
    g.rect(0, 0, W, 22, 'g');
    for (let x = 0; x < W; x++) { g.set(x, 4, 'h'); g.set(x, 16, 'h'); g.set(x, 17, 'T'); }
    for (let x = 0; x < W; x += 12) for (let j = 0; j < 12; j++) { g.set(x + j, 5 + j, 'X'); g.set(x + 11 - j, 5 + j, 'X'); }
    for (let x = 0; x < W; x++) if (x % 48 > 6 && x % 48 < 42) { g.set(x, 1, '.'); g.set(x, 2, '.'); }       // Oberlicht
    g.rect(0, 18, W, 4, 'i'); g.rect(0, 18, W, 1, 'l'); g.rect(0, 21, W, 1, 'h');                       // Ringbalken aus Beton
    g.rect(0, 92, W, 3, 'i'); g.rect(0, 92, W, 1, 'l');                                                  // Betonband unter den Fenstern
    for (let bx = 0; bx <= W; bx += 96) { g.rect(bx - 4, 22, 8, FLOOR - 28, 'v'); g.rect(bx - 4, 22, 1, FLOOR - 28, 'w'); g.rect(bx + 3, 22, 1, FLOOR - 28, 't'); for (let y = 24; y < FLOOR - 6; y += 6) g.rect(bx - 4, y, 8, 1, 't'); }
    const PW = [[14, 22], [60, 22], [110, 22], [156, 22], [206, 22]];   /* rechts vom letzten Feld ist das Hangartor: dort keine Fenster mehr */
    for (const [x0, w] of PW) {
      const y0 = 32, h = 56;
      g.rect(x0 - 2, y0 - 2, w + 4, h + 4, 'g'); g.rect(x0 - 2, y0 - 3, w + 4, 1, 'i');
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g.set(x, y, ((x - x0) % 6 === 5 || (y - y0) % 8 === 7) ? 'h' : '.');
      wins.push({ x: x0, y: y0, w, h });
    }
    plinth(g, 'h');
    return { s: G2S(g), wins };
  }
  const WALLS = { pfoertner: officeWall(), blechwerkstatt: archWall('brick'), maschinenhalle: tealWall(), prueflabor: labWall(), kraftwerk: powerWall() };

  // ---------- Böden ----------
  function floor(g, k, kind) {
    const nightK = .15 + k.night * .35;
    if (kind === 'wood') {
      const base = mix(hx('#a5703f'), k.tree, nightK), dark = mix(base, hx('#24182a'), .35);
      for (let y = FLOOR; y < H; y++) { const c = mix(base, dark, (y - FLOOR) / (H - FLOOR)); R(g, 0, y, W, 1, rgb(c)); if ((y - FLOOR) % 6 === 0) R(g, 0, y, W, 1, rgb(mix(c, dark, .5))); }
      for (let y = FLOOR; y < H; y += 6) for (let x = (y * 7) % 40; x < W; x += 40) R(g, x, y, 1, 6, rgb(mix(base, dark, .6)));
      return;
    }
    const base = mix(hx(kind === 'tile' ? '#b5afb0' : '#8f8a92'), k.tree, nightK), dark = mix(base, hx('#24182a'), .35);
    for (let y = FLOOR; y < H; y++) { const c = mix(base, dark, (y - FLOOR) / (H - FLOOR)); R(g, 0, y, W, 1, rgb(c)); if (y % 7 === 0) { g.fillStyle = rgb(mix(c, dark, .4)); for (let x = (y * 3) % 2; x < W; x += 2) g.fillRect(x, y, 1, 1); } }
    for (let x = 0; x < W; x += kind === 'tile' ? 24 : 48) R(g, x, FLOOR + 2, 1, H - FLOOR, rgb(mix(base, dark, .5)));
    if (kind !== 'tile') { const yl = rgb(mix(hx('#e8a83a'), k.tree, .2 + k.night * .4)); for (let x = 0; x < W; x += 8) R(g, x, FLOOR + 50, 5, 2, yl); }
  }

  // ---------- Detail-Werkzeuge: Bauteile mit Kontur, Schrauben, Schlitze, Knöpfe, Anzeigen ----------
  const DARK = { metal: 'T', stone: 'g', teal: 'O', gold: 'C', wood: 'a', blue: 'x', brick: 's', plaster: 'S', green: 'm' };
  function part(g, x, y, w, h, ramp, base) { g.rect(x, y, w, h, DARK[ramp] || 'a'); if (w > 2 && h > 2) fill(g, x + 1, y + 1, w - 2, h - 2, ramp, base); }
  function bolt(g, x, y) { g.set(x, y, 'l'); g.set(x + 1, y, 'h'); }
  function slits(g, x, y, w, h, dark, light) { for (let j = 0; j < h; j += 2) { g.rect(x, y + j, w, 1, dark || 'T'); if (j + 1 < h) g.rect(x, y + j + 1, w, 1, light || 'X'); } }
  function knob(g, x, y, c) { g.set(x, y, c); g.set(x + 1, y, c); g.set(x, y + 1, c); g.set(x + 1, y + 1, 'a'); g.set(x, y, 'J'); }
  function gauge(g, cx, cy) { for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const d = x * x + y * y; if (d <= 5) g.set(cx + x, cy + y, d >= 4 ? 'g' : 'J'); } g.set(cx, cy, 'a'); g.set(cx + 1, cy - 1, 'u'); }
  function hazard(g, x, y, w, h) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.set(x + i, y + j, ((i + j) >> 1) % 2 ? 'a' : 'E'); }
  function wheel(g, cx, cy, r) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d <= r + .3 && d > r - 1) g.set(cx + x, cy + y, y < 0 ? 'j' : 'h'); } g.rect(cx - r + 1, cy, 2 * r - 1, 1, 'h'); g.rect(cx, cy - r + 1, 1, 2 * r - 1, 'h'); g.set(cx, cy, 'u'); g.set(cx + r, cy - r, 'u'); g.set(cx + r + 1, cy - r - 1, 'u'); }
  function screenAt(g, x, y, w, h) { g.rect(x - 1, y - 1, w + 2, h + 2, 'a'); g.rect(x, y, w, h, 'U'); for (let j = 1; j < h - 1; j += 2) g.rect(x + 1, y + j, Math.max(1, w - 2 - (j * 3) % 4), 1, j === 1 ? 'z' : 'y'); }
  // ---------- Schattier-Werkzeug (wie beim Mecha): Licht von links oben, weiche Stufen mit geordnetem Dithering ----------
  const RP = { metal: ['U', 'T', 'X', 'Y', 'Z', 'l'], steel: ['g', 'h', 'i', 'j', 'l', 'H'], teal: ['O', 'O', 'P', 'Q', 'B'], gold: ['C', 'D', 'E', 'F', 'G'],
    red: ['s', 't', 'u', 'v', 'w'], wood: ['a', 'b', 'c', 'd', 'e', 'f'], blue: ['x', 'y', 'z', 'A', 'B'], dark: ['U', 'x', 'T', 'X', 'y', 'Y'], glass: ['O', 'P', 'Q', 'B', 'J'] };
  const BAY4 = [[0, .5], [.75, .25]];
  const tone = (ramp, l, x, y) => { if (ramp === 'steel') l -= .16; const R2 = RP[ramp] || ramp, n = R2.length, v = Math.max(0, Math.min(.999, (l + .25) / 1.25)) * n, i = Math.floor(v), f = v - i; return R2[Math.min(n - 1, i + (f > BAY4[y & 1][x & 1] + .12 ? 1 : 0))]; };
  const SL = { x: -.55, y: -.65, z: .52 };
  function shBall(g, cx, cy, rx, ry, ramp, rim) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny; if (d > 1) continue; let l = nx * SL.x + ny * SL.y + Math.sqrt(1 - d) * SL.z; if (d > .82 && rim !== false) l -= .3; g.set(x, y, tone(ramp, l, x, y)); } }
  function shCylH(g, x0, y0, x1, y1, ramp, cap) {   // liegender Zylinder (Rohr, Kessel): Helligkeit über die Höhe
    const h = y1 - y0; for (let y = y0; y <= y1; y++) { const ny = ((y - y0) / Math.max(1, h)) * 2 - 1; const base = -ny * .62 + Math.sqrt(Math.max(0, 1 - ny * ny)) * .45;
      for (let x = x0; x <= x1; x++) { let l = base; if (cap && (x - x0 < 2)) l += .15; if (cap && (x1 - x < 2)) l -= .25; g.set(x, y, tone(ramp, l, x, y)); } } }
  function shCylV(g, x0, y0, x1, y1, ramp) {         // stehender Zylinder: Helligkeit über die Breite
    const w = x1 - x0; for (let x = x0; x <= x1; x++) { const nx = ((x - x0) / Math.max(1, w)) * 2 - 1, base = -nx * .55 + Math.sqrt(Math.max(0, 1 - nx * nx)) * .5;
      for (let y = y0; y <= y1; y++) { let l = base; if (y === y0) l += .3; if (y === y1) l -= .35; g.set(x, y, tone(ramp, l, x, y)); } } }
  function shBox(g, x0, y0, x1, y1, ramp) {           // Kasten mit Fase: Kanten hell oben/links, dunkel unten/rechts, leichter Verlauf
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { let l = .35 - (y - y0) / Math.max(1, y1 - y0) * .35;
      if (x === x0 || y === y0) l += .35; if (x === x1 || y === y1) l -= .45; else if (x1 - x < 2 || y1 - y < 2) l -= .15; g.set(x, y, tone(ramp, l, x, y)); } }
  // Nachbelichtung für ältere, flach gemalte Sprites: Verlauf von oben hell nach unten dunkel, helle Oberkante, dunkle Unterkante, Dithering
  const RLR = ['abcdef', 'ghijl', 'TXYZ', 'xyzAB', 'OPQ', 'CDEFG', 'stuvw', 'SIHJ'].map(r => r.split(''));
  function relight(rows, k) {
    k = k === undefined ? 1 : k; const h = rows.length, w = Math.max(...rows.map(r => r.length)), A = rows.map(r => r.padEnd(w, '.').split(''));
    const get = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? '.' : rows[y][x] || '.';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = A[y][x]; if (c === '.') continue; const r = RLR.find(q => q.includes(c)); if (!r) continue;
      let v = (.35 - y / Math.max(1, h - 1) * .7) * k; if (get(x, y - 1) === '.') v += .8; else if (get(x, y + 1) === '.') v -= .8; if (get(x - 1, y) === '.') v += .4; else if (get(x + 1, y) === '.') v -= .5;
      const i = r.indexOf(c), f = v - Math.floor(v), n = i + Math.floor(v) + (f > BAY4[y & 1][x & 1] + .1 ? 1 : 0); A[y][x] = r[Math.max(0, Math.min(r.length - 1, n))]; }
    return A.map(r => r.join(''));
  }
  function shBolt(g, x, y) { g.set(x, y, 'l'); g.set(x + 1, y, 'h'); g.set(x, y + 1, 'h'); g.set(x + 1, y + 1, 'g'); }
  function shGauge(g, cx, cy, r) { shBall(g, cx, cy, r, r, 'steel'); for (let y = -r + 2; y <= r - 2; y++) for (let x = -r + 2; x <= r - 2; x++) if (x * x + y * y <= (r - 2) * (r - 2)) g.set(cx + x, cy + y, 'J'); g.set(cx, cy, 'a'); g.set(cx + 1, cy - 1, 'u'); g.set(cx - r + 2, cy, 'g'); g.set(cx + r - 2, cy, 'g'); }
  function cylV(g, x, y, w, h) { for (let i = 0; i < w; i++) g.rect(x + i, y, 1, h, i === 0 ? 'T' : i === w - 1 ? 'T' : i === 1 ? 'Z' : 'Y'); }

  // ---------- Maschinen ----------
  // Abkantbank
  function pressGrid() {
    const g = Grid(84, 60);
    for (const x of [18, 60]) { cylV(g, x, 0, 6, 7); g.rect(x - 1, 0, 8, 1, 'T'); g.rect(x - 1, 6, 8, 1, 'g'); }       // Hydraulikzylinder
    g.rect(16, 18, 52, 18, 'T'); for (let x = 20; x < 66; x += 6) g.rect(x, 19, 1, 15, 'g');                     // dunkler Arbeitsraum
    for (const x of [2, 68]) { part(g, x, 4, 14, 50, 'teal', 2); g.rect(x + 4, 8, 1, 40, 'O'); g.rect(x + 5, 8, 1, 40, 'Q'); bolt(g, x + 2, 6); bolt(g, x + 10, 6); bolt(g, x + 2, 50); bolt(g, x + 10, 50); }
    slits(g, 72, 38, 7, 8, 'O', 'P'); g.rect(4, 28, 5, 4, 'E'); g.set(6, 29, 'a'); g.set(6, 30, 'a');              // Lüftung, Warnschild
    part(g, 14, 6, 56, 12, 'teal', 2); g.rect(30, 8, 24, 4, 'C'); g.rect(31, 9, 22, 2, 'E'); for (let i = 0; i < 20; i += 3) g.rect(32 + i, 9, 2, 1, 'C');   // Querhaupt mit Typenschild
    for (let x = 17; x < 68; x += 6) bolt(g, x, 15);
    g.rect(26, 34, 32, 2, 'T'); g.rect(27, 34, 30, 1, 'Z'); g.rect(40, 33, 4, 1, 'Z');                               // Unterwerkzeug
    part(g, 10, 36, 64, 10, 'teal', 2); for (let x = 14; x < 72; x += 8) bolt(g, x, 38); g.rect(12, 42, 60, 1, 'O');
    part(g, 0, 51, 84, 9, 'stone', 2); hazard(g, 2, 52, 80, 2); for (const x of [3, 74]) { g.rect(x, 57, 7, 3, 'g'); g.rect(x, 57, 7, 1, 'i'); }
    g.rect(82, 10, 1, 41, 'a'); g.rect(81, 10, 1, 2, 'a');                                                            // Kabel
    return g;
  }
  // Abkantbank je Ausbaustufe: Stufe 1 alt und abgenutzt, Stufe 2 frisch lackiert, Stufe 3 mit Warnkanten (Farbe bleibt)
  function pressLevel(l) {
    const g = pressGrid(), r = ART.rng(4);
    if (l === 1) for (let i = 0; i < 70; i++) { const x = Math.floor(r() * 84), y = Math.floor(r() * 50); if ('PQ'.includes(g.get(x, y))) g.set(x, y, r() < .5 ? 'c' : 'O'); }
    if (l >= 3) { for (const x of [2, 68]) { for (let y = 5; y < 53; y += 2) { g.set(x + 1, y, 'E'); g.set(x + 1, y + 1, 'a'); } } }
    return trio(g, 5);
  }
  const PRESSL = [1, 2, 3].map(pressLevel), PRESS = PRESSL[0];
  // Hydraulikaggregat (ab Stufe 2) auf dem Querhaupt, CNC-Pult auf Ständer (Stufe 3)
  const HPU = S((() => { const g = Grid(26, 13); part(g, 0, 3, 14, 10, 'teal', 1); g.rect(2, 5, 2, 5, 'A'); g.rect(2, 5, 2, 2, 'z'); g.rect(6, 6, 6, 1, 'O'); g.rect(6, 8, 6, 1, 'O'); part(g, 14, 5, 10, 7, 'metal', 2); for (let x = 16; x < 23; x += 2) g.rect(x, 6, 1, 5, 'X'); g.rect(24, 7, 2, 3, 'T'); g.rect(4, 0, 3, 3, 'h'); g.set(5, 0, 'u'); return g.rows(); })());
  const CNCP = S((() => { const g = Grid(18, 34); part(g, 0, 0, 18, 13, 'teal', 1); screenAt(g, 2, 2, 14, 7); knob(g, 3, 10, 'q'); knob(g, 7, 10, 'E'); knob(g, 12, 10, 'u'); g.rect(8, 13, 3, 18, 'T'); g.rect(9, 13, 1, 18, 'Y'); part(g, 3, 31, 12, 3, 'metal', 1); return g.rows(); })());
  const RAM = S((() => { const g = Grid(52, 12); part(g, 0, 0, 52, 7, 'metal', 2); bolt(g, 3, 2); bolt(g, 47, 2); g.rect(4, 4, 44, 1, 'X'); g.rect(16, 7, 20, 2, 'T'); g.rect(17, 7, 18, 1, 'Y'); for (let j = 0; j < 3; j++) { const w = 12 - j * 4; g.rect(26 - w / 2, 9 + j, w, 1, j ? 'Y' : 'Z'); } g.set(25, 11, 'l'); return g.rows(); })());
  const RAM_B = S((() => { const g = Grid(52, 10); fill(g, 0, 0, 52, 7, 'stone', 1); g.rect(16, 7, 20, 2, 'h'); return g.rows(); })());
  const SHEET = S(['Z'.repeat(36), 'Y'.repeat(36)]);
  const SHEETBENT = S(['Z..................................Z', 'YZ................................ZY', '.YZ..............................ZY.', '..YZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZY..']);
  const PANEL = S(['.gggg.', 'ghhhhg', 'gqhuhg', 'ghEhhg', '.gggg.', '..g...', '..g...', '..g...', '..g...', '..g...', '..g...', '.ggg..']);

  // Notstromaggregat (groß)
  const GEN = trio((() => {   // Notstromaggregat: Gehäuse mit Fase, Lüftungslamellen, Bedienfeld, runde Manometer, Kühler, Auspuff mit Schalldämpfer
    const g = Grid(70, 40);
    shCylV(g, 10, 0, 13, 9, 'metal'); shCylH(g, 8, 3, 15, 6, 'steel', 1);                                            // Auspuff mit Topf
    shCylH(g, 16, 4, 25, 8, 'metal', 1); g.rect(18, 4, 6, 1, 'Z'); shBall(g, 21, 3, 2, 1.5, 'red');                  // Tankstutzen mit Deckel
    shBox(g, 2, 8, 51, 33, 'teal'); for (const [x, y] of [[4, 10], [48, 10], [4, 31], [48, 31]]) shBolt(g, x, y);
    for (let y = 12; y < 30; y += 3) for (let x = 6; x < 24; x++) { g.set(x, y, 'O'); g.set(x, y + 1, tone('teal', .55 - (x - 6) * .02, x, y + 1)); }   // Lamellen
    shBox(g, 28, 10, 49, 31, 'dark'); screenAt(g, 31, 13, 16, 7); shGauge(g, 34, 26, 3); shGauge(g, 46, 26, 3); shBall(g, 40, 23, 1.5, 1.5, ['m', 'n', 'o', 'p', 'q', 'r']); shBall(g, 40, 27, 1.5, 1.5, 'red');
    shBox(g, 52, 13, 66, 33, 'metal'); for (let y = 15; y < 32; y += 2) for (let x = 54; x < 65; x++) g.set(x, y, tone('metal', .1 - (x - 54) * .03, x, y));   // Kühler
    shBox(g, 0, 33, 69, 39, 'steel'); hazard(g, 2, 34, 66, 1); for (const x of [3, 60]) shBox(g, x, 37, x + 6, 39, 'dark');
    for (let y = 20; y < 34; y++) { g.set(0, y, 'a'); g.set(1, y, y % 3 ? 'U' : 'a'); }                              // Kabel
    return g;
  })(), 7);

  // Fräsmaschine (Ständerbauweise)
  const MILL = trio((() => {
    const g = Grid(56, 70);
    part(g, 30, 0, 16, 61, 'teal', 1); slits(g, 33, 30, 10, 10, 'O', 'P'); bolt(g, 32, 2); bolt(g, 42, 2); bolt(g, 32, 56); bolt(g, 42, 56);   // Ständer
    part(g, 8, 1, 14, 8, 'metal', 2); for (let x = 10; x < 20; x += 2) g.rect(x, 2, 1, 6, 'X');                     // Motor mit Kühlrippen
    part(g, 6, 8, 30, 14, 'teal', 2); screenAt(g, 10, 11, 9, 5); knob(g, 23, 11, 'E'); knob(g, 23, 16, 'u'); bolt(g, 8, 10); bolt(g, 33, 10);   // Fräskopf
    g.rect(18, 21, 7, 2, 'T'); g.rect(19, 21, 5, 1, 'X');                                                          // Pinolengehäuse
    g.rect(26, 22, 1, 14, 'a'); g.rect(25, 35, 2, 1, 'a');                                                         // Kühlmittelschlauch
    wheel(g, 50, 22, 3); g.rect(46, 21, 3, 2, 'h');                                                                // Handrad
    part(g, 2, 44, 42, 6, 'metal', 2); for (let x = 5; x < 42; x += 6) g.rect(x, 45, 3, 1, 'T');                    // Tisch mit T-Nuten
    g.rect(2, 50, 42, 2, 'T');
    part(g, 8, 52, 30, 8, 'teal', 1); wheel(g, 41, 56, 2);                                                         // Konsole mit Kurbel
    part(g, 0, 60, 56, 10, 'stone', 1); hazard(g, 2, 61, 52, 1); for (const x of [2, 46]) g.rect(x, 68, 8, 2, 'g');
    return g;
  })(), 9);
  const SPINDLE = [S(['.ii.', 'ijji', 'ijji', 'ijji', '.hh.', '.jh.', '.hj.', '.jh.', '..h.']), S(['.ii.', 'ijji', 'ijji', 'ijji', '.hh.', '.hj.', '.jh.', '.hj.', '.h..'])];
  const WORKPIECE = S(['DEEEEED', 'DFFFFFD', 'CDDDDDC']);

  // Drehmaschine
  const LATHE = trio((() => {
    const g = Grid(100, 46);
    part(g, 0, 6, 22, 26, 'teal', 2); screenAt(g, 4, 10, 9, 5); knob(g, 16, 10, 'E'); knob(g, 16, 15, 'u');        // Spindelkasten
    for (const x of [3, 9, 15]) { g.rect(x, 21, 4, 4, 'g'); g.rect(x + 1, 22, 2, 2, 'j'); g.set(x + 1, 22, 'l'); }   // Wahlschalter
    g.rect(2, 27, 18, 1, 'O'); bolt(g, 2, 8); bolt(g, 18, 8);
    part(g, 2, 28, 96, 6, 'metal', 2); g.rect(3, 29, 94, 1, 'Z'); g.rect(3, 31, 94, 1, 'Z'); g.rect(3, 30, 94, 1, 'X');   // Bett mit Führungen
    for (let x = 6; x < 96; x += 10) g.set(x, 32, 'T');
    g.rect(20, 34, 64, 1, 'h'); for (let x = 20; x < 84; x += 2) g.set(x, 34, 'j');                                 // Leitspindel
    part(g, 84, 14, 14, 16, 'teal', 1); g.rect(86, 18, 10, 3, 'i'); g.rect(86, 18, 10, 1, 'l'); bolt(g, 86, 26); bolt(g, 94, 26);   // Reitstock
    wheel(g, 97, 21, 2);
    for (const x of [6, 74]) { part(g, x, 35, 14, 11, 'teal', 1); g.rect(x + 2, 37, 10, 7, 'O'); g.rect(x + 10, 40, 1, 2, 'E'); }   // Unterschränke
    return g;
  })(), 11);
  const CHUCK = [S(['.hjh.', 'hjijh', 'jiiij', 'hjijh', 'hjijh', 'jiiij', 'hjijh', '.hjh.']), S(['.jhj.', 'jihij', 'hiiih', 'jihij', 'jihij', 'hiiih', 'jihij', '.jhj.'])];
  // Ausbau-Zubehör: Kühlmittelanlage, Späneförderer, Stangenlader, Werkzeugrevolver, Wendelförderer, Kamera-Portal, Teilebunker
  const COOLANT = S((() => { const g = Grid(18, 22); part(g, 0, 8, 18, 14, 'blue', 2); g.rect(2, 11, 3, 8, 'A'); g.rect(2, 11, 3, 3, 'z'); g.rect(7, 12, 9, 1, 'x'); g.rect(7, 15, 9, 1, 'x'); part(g, 8, 2, 8, 6, 'metal', 2); g.rect(10, 0, 4, 2, 'h'); g.rect(16, 4, 2, 2, 'h'); return g.rows(); })());
  const CHIPCONV = S((() => { const g = Grid(40, 30); for (let i = 0; i < 26; i++) { const y = 26 - Math.floor(i * .75); g.rect(i, y - 5, 1, 6, i % 4 === 0 ? 'X' : 'Y'); g.set(i, y - 5, 'Z'); g.set(i, y, 'T'); } part(g, 24, 6, 16, 12, 'metal', 2); g.rect(25, 6, 14, 1, 'E'); for (let x = 25; x < 39; x += 4) g.set(x, 7, 'a');   /* Spänewagen aus Stahl mit gelber Kante */
    for (let x = 25; x < 39; x++) { const hgt = Math.round(3 * Math.sin((x - 24) / 15 * Math.PI)); for (let y = 6 - hgt; y < 6; y++) g.set(x, y, (x * 3 + y * 5) % 4 === 0 ? 'l' : (x + y) % 3 ? 'j' : 'i'); }   /* Haufen gelockter Späne */ g.rect(26, 18, 3, 3, 'a'); g.rect(35, 18, 3, 3, 'a'); g.rect(2, 26, 6, 4, 'T'); return g.rows(); })());
  const BARLOAD = S((() => { const g = Grid(50, 24); g.rect(0, 0, 50, 4, 'T'); g.rect(0, 1, 50, 2, 'X'); g.rect(0, 2, 50, 1, 'Z'); for (let x = 4; x < 48; x += 11) g.rect(x, 0, 2, 4, 'g');   // Führungsrohr bis in die Spindel
    part(g, 2, 5, 40, 9, 'metal', 1); for (let i = 0; i < 4; i++) { g.rect(4, 6 + i * 2, 36, 1, i % 2 ? 'j' : 'l'); g.set(39, 6 + i * 2, 'h'); }   // Magazin mit liegenden Stangen
    g.rect(2, 5, 40, 1, 'E'); g.rect(2, 13, 40, 1, 'E');
    for (const x of [4, 36]) part(g, x, 14, 4, 10, 'metal', 1); g.rect(8, 18, 28, 2, 'X'); part(g, 42, 6, 6, 8, 'teal', 1); g.set(44, 8, 'q'); return g.rows(); })());
  const TURRET = S(['.hjjh..', 'hjllj..', 'jliilj.', 'hjiijhZ', '.hjjhZ.', 'ttuuttt', 'tuuuuut', 'ggggggg']);
  const BOWL = S((() => { const g = Grid(18, 14); for (let y = 0; y < 6; y++) { const w = 16 - Math.abs(2 - y) * 2; g.rect(9 - w / 2, y, w, 1, y === 0 ? 'Z' : y < 3 ? 'Y' : 'X'); } for (let i = 0; i < 12; i += 2) g.set(3 + i, 2, 'i'); part(g, 5, 6, 8, 5, 'metal', 1); g.rect(13, 3, 5, 2, 'Y'); part(g, 3, 11, 12, 3, 'teal', 1); return g.rows(); })());
  const BIGPLANT = S((() => { const g = Grid(20, 36); const leaf = (cx, cy, w, h, dir) => { for (let y = 0; y < h; y++) { const ww = Math.round(w * Math.sin((y + 1) / (h + 1) * Math.PI)); for (let x = 0; x < ww; x++) g.set(cx + (dir > 0 ? x : -x), cy + y, x === 0 ? 'n' : y < h / 2 ? 'q' : 'p'); } };
    [[10, 2, 4, 8, 1], [9, 4, 4, 8, -1], [12, 9, 6, 7, 1], [7, 10, 6, 7, -1], [13, 15, 6, 6, 1], [6, 16, 6, 6, -1], [10, 13, 3, 6, 1]].forEach(a => leaf(...a));
    for (let y = 8; y < 26; y++) g.set(10, y, 'o'); g.set(9, 14, 'o'); g.set(11, 18, 'o');
    part(g, 4, 25, 13, 11, 'brick', 2); g.rect(3, 25, 15, 2, 'v'); g.rect(3, 26, 15, 1, 'u'); return g.rows(); })());
  const CARRIAGE = S(['..hh..', '.hjjh.', 'hiiiih', 'ttuutt', 'tuuuut', 'gggggg']);
  const SHAFT = S(['EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD']);

  // Gewindeschneidplatz (Werkbank mit Gewindebohrer-Arm)
  const TAP = trio((() => {
    const g = Grid(64, 52);
    part(g, 0, 29, 64, 5, 'wood', 4); g.rect(1, 30, 62, 1, 'f');                                                   // Werkbankplatte
    part(g, 3, 34, 26, 11, 'wood', 3); g.rect(4, 39, 24, 1, 'b'); for (const y of [36, 41]) g.rect(14, y, 4, 1, 'h');   // Schubladen
    for (const x of [2, 58]) part(g, x, 34, 4, 18, 'metal', 2); g.rect(30, 46, 28, 2, 'X');
    part(g, 34, 2, 6, 28, 'metal', 2); g.rect(35, 3, 1, 26, 'Z');                                                  // Säule
    part(g, 26, 0, 12, 5, 'metal', 1); for (let x = 28; x < 37; x += 2) g.rect(x, 1, 1, 3, 'X');                    // Motor
    part(g, 22, 4, 22, 10, 'blue', 2); screenAt(g, 25, 7, 7, 3); knob(g, 38, 7, 'E');                                // Kopf
    for (const [x, y] of [[45, 6], [47, 9], [45, 12]]) { g.set(x, y, 'h'); g.set(x - 1, y, 'h'); g.set(x + 1, y, 'a'); }   // Vorschubhebel
    part(g, 22, 24, 22, 6, 'metal', 1); g.rect(28, 22, 2, 2, 'Y'); g.rect(36, 22, 2, 2, 'Y'); g.rect(24, 26, 2, 2, 'u');  // Schraubstock mit Backen
    part(g, 2, 21, 14, 9, 'teal', 1); for (let i = 0; i < 5; i++) { g.rect(4 + i * 2, 22, 1, 6, 'Z'); g.set(4 + i * 2, 22, 'l'); }   // Gewindebohrer-Kasten
    part(g, 44, 24, 14, 6, 'metal', 2); bolt(g, 46, 26); bolt(g, 54, 26);                                          // Ablage für die Kiste
    return g;
  })(), 13);
  const TAPBIT = [S(['Y', 'Z', 'Y', 'Z', 'Y', 'Z']), S(['Z', 'Y', 'Z', 'Y', 'Z', 'Y'])];

  // Montageplatz mit Roboterarm
  const ASSY = trio((() => {
    const g = Grid(90, 50);
    // Förderband: dunkler Gurt, seitliche Schiene mit Schrauben, Rollen vorne sichtbar
    g.rect(0, 29, 90, 2, 'T'); g.rect(0, 29, 90, 1, 'X'); for (let x = 1; x < 90; x += 6) g.set(x, 30, 'Y');
    g.rect(0, 31, 90, 4, 'Y'); g.rect(0, 31, 90, 1, 'Z'); g.rect(0, 34, 90, 1, 'X'); g.rect(0, 35, 90, 1, 'T');
    for (let x = 3; x < 88; x += 6) { g.set(x, 32, 'h'); g.set(x + 1, 32, 'j'); g.set(x, 33, 'g'); g.set(x + 1, 33, 'h'); }
    for (const x of [1, 88]) { g.rect(x, 31, 1, 4, 'X'); }
    // Beine mit Fuß und Querstrebe
    for (const x of [4, 80]) { g.rect(x, 36, 6, 12, 'X'); g.rect(x, 36, 1, 12, 'Y'); g.rect(x + 5, 36, 1, 12, 'T'); g.rect(x - 1, 48, 8, 2, 'T'); g.rect(x - 1, 48, 8, 1, 'X'); g.set(x + 2, 38, 'Z'); }
    g.rect(10, 42, 70, 2, 'X'); g.rect(10, 42, 70, 1, 'Y'); g.rect(10, 44, 70, 1, 'T');
    // Kabelkanal vom Pult zum Roboter
    g.rect(24, 27, 25, 2, 'g'); g.rect(24, 27, 25, 1, 'h');
    // Roboterfuß: Drehteller, Gehäuse mit Fugen, Warnstreifen, Schrauben
    g.rect(47, 17, 18, 2, 'Y'); g.rect(47, 17, 18, 1, 'Z'); g.rect(49, 16, 14, 1, 'Y');
    fill(g, 48, 19, 16, 10, 'gold', 2); g.rect(48, 19, 16, 1, 'F'); g.rect(55, 20, 1, 8, 'C'); g.rect(49, 25, 14, 1, 'C');
    for (let x = 49; x < 63; x += 2) { g.set(x, 27, x % 4 === 1 ? 'a' : 'E'); g.set(x + 1, 27, x % 4 === 1 ? 'E' : 'a'); }
    for (const [x, y] of [[49, 20], [62, 20], [49, 24], [62, 24]]) g.set(x, y, 'C');
    g.rect(58, 21, 3, 2, 'a'); g.set(59, 21, 'q');
    // Steuerpult: Gehäuse, schräges Bedienfeld, Bildschirm, Tasten, Not-Aus
    fill(g, 5, 9, 20, 20, 'teal', 1); g.rect(5, 9, 20, 1, 'Q'); g.rect(5, 9, 1, 20, 'Q'); g.rect(24, 9, 1, 20, 'O');
    g.rect(7, 11, 16, 9, 'g'); g.rect(8, 12, 14, 7, 'U'); g.rect(9, 13, 8, 1, 'z'); g.rect(9, 15, 11, 1, 'y'); g.rect(9, 17, 6, 1, 'y'); g.set(20, 13, 'q');
    g.rect(6, 21, 18, 1, 'O'); g.rect(7, 22, 16, 5, 'P'); g.rect(7, 22, 16, 1, 'Q');
    g.set(8, 23, 'q'); g.set(10, 23, 'u'); g.set(12, 23, 'E'); for (let x = 8; x < 16; x += 2) g.set(x, 25, 'Z');
    g.rect(18, 23, 3, 2, 'u'); g.rect(19, 22, 1, 1, 'v'); g.set(18, 25, 'E'); g.set(20, 25, 'E');
    g.rect(5, 28, 20, 1, 'O');
    return g;
  })(), 15);
  const ASSY_PART = S(['.ZZZ.', 'ZPQPZ', 'ZQEQZ', 'ZPQPZ', '.ZZZ.']);

  // Turbine (Kraftwerk)
  const TURB = trio((() => {
    const g = Grid(150, 56);
    // Grundrahmen mit Füßen
    shBox(g, 4, 47, 146, 52, 'metal'); for (const x of [8, 40, 74, 104, 136]) { shBox(g, x, 52, x + 6, 55, 'dark'); shBolt(g, x + 2, 48); }
    // Dampfeinlass: Konus links mit Flansch
    for (let x = 0; x < 12; x++) { const r = 8 + x; shCylH(g, x, 30 - r, x, 30 + r, 'steel'); }
    // Turbinengehäuse: großer liegender Kessel mit Flanschringen und Bolzen
    shCylH(g, 12, 9, 88, 47, 'steel', 1);
    for (const fx of [12, 36, 62, 86]) { shCylH(g, fx, 7, fx + 2, 49, 'metal'); for (let y = 11; y < 46; y += 5) shBolt(g, fx, y); }
    g.rect(14, 28, 72, 1, 'h'); for (let x = 16; x < 86; x += 3) g.set(x, 29, 'j');                                          // Teilfuge
    // Mannloch mit Handrad oben, Dampfleitung nach oben
    shBox(g, 44, 2, 56, 9, 'metal'); wheel(g, 50, 4, 3); shCylV(g, 70, 0, 75, 9, 'steel'); shCylH(g, 68, 8, 77, 10, 'metal');
    // Schauglas mit Glühen, Manometer, Typenschild
    shBox(g, 40, 15, 58, 25, 'dark'); for (let y = 17; y < 24; y++) for (let x = 42; x < 57; x++) g.set(x, y, (x + y) % 5 ? 'V' : 'W'); g.rect(42, 17, 15, 1, 'G'); shBolt(g, 40, 15); shBolt(g, 57, 15); shBolt(g, 40, 24); shBolt(g, 57, 24);
    shGauge(g, 24, 19, 5); shGauge(g, 76, 19, 4); shBox(g, 22, 34, 34, 40, 'gold'); g.rect(24, 36, 8, 1, 'C'); g.rect(24, 38, 6, 1, 'C');
    // Welle zum Schwungrad
    shCylH(g, 88, 25, 98, 33, 'metal');
    // Generator rechts: Rippenkörper in Petrol, Endkappe, Bedienfeld
    shCylH(g, 96, 13, 140, 47, 'teal', 1); for (let x = 99; x < 138; x += 3) { g.rect(x, 14, 1, 33, 'O'); }
    shBall(g, 141, 30, 6, 17, 'teal'); shCylH(g, 104, 9, 132, 13, 'metal');
    shBox(g, 101, 20, 136, 42, 'dark'); for (let y = 22; y < 29; y++) for (let x = 103; x < 117; x++) g.set(x, y, (y === 24 || y === 26) && x < 113 ? 'z' : 'U');
    for (const [x, c] of [[104, 'q'], [109, 'E'], [114, 'u']]) { shBall(g, x, 37, 2, 2, c === 'q' ? ['n', 'o', 'p', 'q', 'r'] : c === 'E' ? 'gold' : 'red'); }
    shBox(g, 119, 22, 134, 30, 'gold'); for (let x = 121; x < 133; x += 3) g.rect(x, 24, 2, 4, 'C'); shBox(g, 119, 33, 134, 40, 'metal'); for (let x = 121; x < 133; x += 2) g.rect(x, 35, 1, 4, 'T');
    return g;
  })(), 7);
  const FLY = [0, 1, 2, 3].map(f => S((() => { const g = Grid(19, 19); shBall(g, 9, 9, 9.5, 9.5, 'metal');   // Schwungrad: schattierter Kranz, 4 Speichen drehen sich, Nabe
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d = x * x + y * y; if (d < 42) g.set(9 + x, 9 + y, d < 6 ? '.' : 'U'); }
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + f * Math.PI / 8; for (let r = 2; r < 7; r++) { const x = Math.round(9 + Math.cos(a) * r), y = Math.round(9 + Math.sin(a) * r); g.set(x, y, 'Y'); g.set(x + (Math.abs(Math.sin(a)) > .7 ? 1 : 0), y + (Math.abs(Math.sin(a)) > .7 ? 0 : 1), 'X'); } }
    shBall(g, 9, 9, 2.5, 2.5, 'gold'); return g.rows(); })()));
  // ---------- Kraftwerk: Riesen-Golem als Mecha im Bau, Energiekapseln, Gerüst und Portalkran ----------
  const MECHA_STAGES = ['Gerüst und Füße', 'Beine und Becken', 'Rumpf mit Energiekern', 'Arme, Fäuste und Schläuche', 'Schulterpanzer', 'Kuppelkopf mit Augen', 'Fertig: der Mecha ist startklar'];
  // Riesen-Mecha in Schrägansicht (blickt nach links) wie der Mecha draußen, nur groß und detailliert.
  // p = { bob, head, swing, raise } nur für den fertigen Mecha (Stufe 6), damit er sich bewegt
  function mechaGrid(stage, p) {
    p = p || {}; const bob = p.bob || 0, hd = p.head || 0, sw = p.swing || 0, rz = p.raise || 0;
    const g = Grid(78, 106), awake = stage >= 6;
    const ST = ['g', 'h', 'i', 'j', 'l'], MT = ['T', 'X', 'Y', 'Z', 'Z'];
    const plate = (x0, y0, x1, y1, base, round, ramp) => {   // Panzerplatte: Licht von links oben, Kanten, Nieten
      const RP = ramp || ST, w = x1 - x0 + 1, h = y1 - y0 + 1;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (round && ((x === x0 || x === x1) && (y === y0 || y === y1))) continue;
        if (round > 1 && ((x - x0 < 2 || x1 - x < 2) && (y - y0 < 2 || y1 - y < 2)) && !((x - x0 === 1 || x1 - x === 1) && (y - y0 === 1 || y1 - y === 1))) continue;
        let v = base; if (x - x0 < 1 || y === y0) v++; if (x1 - x < 1 || y === y1) v -= 2; else if (x1 - x < 3) v--; if ((x - x0) + (y - y0) < 3) v++;
        if (!ramp && w > 10 && h > 10 && x - x0 > 1 && x1 - x > 2 && y - y0 > 1 && y1 - y > 1) { if ((x * 7 + y * 13) % 23 === 0) v--; if ((y - y0) % 9 === 8 && x - x0 > 3 && x1 - x > 4) v--; if ((y - y0) % 9 === 0 && x - x0 > 3 && x1 - x > 4) v++; }   // Kratzer, Plattenfugen
        g.set(x, y, RP[Math.max(0, Math.min(4, v))]);
      }
      if (w > 8 && h > 6 && !ramp) { g.set(x0 + 2, y0 + 2, 'D'); g.set(x1 - 3, y0 + 2, 'C'); g.set(x0 + 2, y1 - 2, 'C'); g.set(x1 - 3, y1 - 2, 'C'); }
    };
    const dark = (x0, y0, x1, y1, base, round) => plate(x0, y0, x1, y1, base - 1, round);
    const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) g.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); };
    const strut = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); g.set(x, y, 'X'); g.set(x + 1, y, 'T'); if (i % 5 === 0) g.set(x, y, 'Y'); } };
    const piston = (x, y0, y1) => { g.rect(x, y0, 3, y1 - y0, 'T'); g.rect(x + 1, y0, 1, y1 - y0, 'Z'); g.rect(x, y0 + Math.floor((y1 - y0) / 2), 3, 1, 'X'); };
    const B = bob;
    // ---- Skelett (Stufe 0, später verdeckt) ----
    strut(30, 14, 30, 96); strut(14, 30, 58, 30); strut(20, 64, 52, 64); strut(26, 64, 26, 97); strut(48, 64, 48, 97); strut(54, 22, 54, 60);
    for (const [x, y] of [[30, 30], [54, 30], [26, 64], [48, 64], [26, 82], [48, 82], [30, 50]]) { g.rect(x - 1, y - 1, 3, 3, 'T'); g.set(x, y, 'E'); }
    // ---- Füße (immer) ----
    dark(38, 96, 62, 103, 2, 2); g.rect(40, 101, 21, 1, 'g');                                         // hinterer Fuß
    plate(6, 95, 38, 103, 3, 2); g.rect(6, 95, 7, 2, 'l'); g.rect(8, 101, 29, 1, 'h'); g.rect(12, 99, 22, 1, 'C'); for (let x = 14; x < 34; x += 6) g.set(x, 99, 'E');   // vorderer Fuß mit Zehenkappe
    if (stage >= 1) {   // ---- Beine und Hüfte ----
      dark(43, 66, 55, 79, 2); piston(46, 68, 78); dark(41, 77, 57, 86, 3, 2); g.rect(43, 81, 13, 1, 'C'); dark(44, 86, 56, 96, 2); g.rect(47, 88, 1, 6, 'O');   // hinteres Bein
      plate(20, 66, 34, 78, 1, 0, MT); piston(23, 67, 78); piston(29, 67, 78);                                                                                     // vorderer Oberschenkel (Hydraulik)
      plate(16, 76, 36, 86, 3, 2); g.rect(18, 81, 17, 2, 'D'); g.rect(18, 81, 17, 1, 'E'); g.set(20, 79, 'l'); g.set(21, 79, 'l');                               // Kniepanzer
      plate(19, 86, 34, 96, 2); g.rect(22, 88, 2, 7, 'P'); g.rect(22, 88, 1, 7, 'Q'); for (let y = 89; y < 95; y += 2) g.set(31, y, 'g');                         // Schienbein
      plate(16, 60 + B, 54, 67 + B, 1, 1, MT); g.rect(18, 62 + B, 35, 1, 'Y'); g.rect(29, 61 + B, 7, 5, 'D'); g.rect(30, 62 + B, 5, 3, 'E');                      // Hüfte
    }
    if (stage >= 3) {   // ---- hinterer Arm und Tornister (hinter dem Rumpf) ----
      const bs = -Math.sign(sw);
      dark(48 + bs, 44 + B, 58 + bs, 66 + B, 2); g.rect(49 + bs, 54 + B, 9, 1, 'C'); dark(46 + bs, 66 + B, 60 + bs, 78 + B, 2, 2);
      plate(50, 16 + B, 70, 52 + B, 2, 1, MT); for (let y = 20; y < 48; y += 3) g.rect(54, y + B, 12, 1, 'T'); g.rect(52, 18 + B, 1, 32, 'O'); g.rect(68, 20 + B, 1, 28, 'T');
      for (const x of [55, 62]) { g.rect(x, 5 + B, 4, 12, 'T'); g.rect(x + 1, 5 + B, 1, 12, 'Y'); g.rect(x - 1, 4 + B, 6, 2, 'X'); g.rect(x - 1, 4 + B, 6, 1, 'Z'); }   // Auspuff
      g.rect(58, 40 + B, 6, 4, 'V'); g.rect(59, 41 + B, 4, 2, awake ? 'W' : 'V'); if (!awake) g.rect(58, 40 + B, 6, 4, 'g');
    }
    if (stage >= 2) {   // ---- Rumpf mit Energiekern, Taille ----
      for (let y = 52; y < 61; y++) g.rect(24, y + B, 24, 1, y % 2 ? 'X' : 'T'); g.rect(24, 52 + B, 24, 1, 'Y');
      plate(28, 22 + B, 54, 54 + B, 2, 2);                                                                 // Flanke
      plate(12, 24 + B, 29, 54 + B, 3, 2); g.rect(15, 22 + B, 14, 2, 'l'); g.rect(28, 24 + B, 1, 30, 'h');  // Front
      g.rect(30, 32 + B, 24, 2, 'P'); g.rect(30, 32 + B, 24, 1, 'Q'); g.rect(30, 34 + B, 24, 1, 'O');      // Zierstreifen
      for (let x = 33; x < 52; x += 3) { g.rect(x, 42 + B, 2, 5, 'T'); g.set(x, 42 + B, 'X'); }             // Lüftung
      g.rect(30, 49 + B, 22, 1, 'h'); g.rect(14, 50 + B, 14, 1, 'h'); g.set(15, 48 + B, 'p'); g.set(16, 49 + B, 'o'); g.set(14, 47 + B, 'o');
      plate(13, 28 + B, 27, 46 + B, 3, 1); g.rect(13, 47 + B, 15, 1, 'g');                                // aufgesetzte Brustplatte
      const cy = 37 + B, cx = 20;
      for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = x * x + y * y; if (d > 38) continue;
        g.set(cx + x, cy + y, d <= 4 ? (awake ? 'G' : 'h') : d <= 12 ? (awake ? 'W' : 'g') : d <= 22 ? (awake ? 'V' : 'T') : d <= 30 ? 'C' : 'E'); }
    }
    const hose = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [a0, b0] = pts[i], [a1, b1] = pts[i + 1]; line(a0, b0, a1, b1, 'c'); line(a0, b0 + 1, a1, b1 + 1, 'b'); line(a0, b0 - 1, a1, b1 - 1, 'e'); } };
    if (stage >= 3) hose([[52, 46 + B], [48, 56 + B], [44, 62 + B - rz * 6], [40 + sw * 2, 60 + B - rz * 10]]);
    if (stage >= 3) hose([[54, 52 + B], [56, 60 + B], [52, 70], [44, 72]]);
    if (stage >= 3) {   // ---- vorderer Arm ----
      plate(36, 38 + B, 46, 48 + B, 1, 0, MT); g.rect(36, 41 + B, 11, 1, 'T'); g.rect(36, 45 + B, 11, 1, 'T');           // Oberarm-Gelenk
      const fx = 32 + sw * 2, fy = 48 + B - rz * 10;
      plate(fx + 1, fy, fx + 15, fy + 16, 3, 1); g.rect(fx + 1, fy + 7, 15, 3, 'D'); g.rect(fx + 1, fy + 7, 15, 1, 'E'); piston(fx + 11, fy + 1, fy + 7);   // Unterarm, Goldband
      plate(fx - 1, fy + 16, fx + 17, fy + 29, 3, 2); for (let i = 0; i < 4; i++) g.rect(fx + 1 + i * 4, fy + 22, 3, 1, 'h'); g.rect(fx, fy + 26, 16, 1, 'h'); g.rect(fx + 1, fy + 18, 2, 3, 'l');   // Faust
    }
    if (stage >= 5) {   // ---- Kopf ----
      const hx = 4 + hd * 2, hy = 6 + B;
      g.rect(hx + 22, hy - 6, 2, 10, 'h'); g.set(hx + 22, hy - 7, 'u'); g.set(hx + 23, hy - 7, 'u');                        // Antenne
      g.rect(14, 22 + B, 14, 4, 'T');                                                                                      // Hals
      plate(hx + 3, hy - 2, hx + 27, hy + 18, 2, 2); plate(hx, hy + 4, hx + 8, hy + 18, 3, 1); g.rect(hx + 4, hy - 1, 20, 1, 'l');                                  // Helm, Gesicht
      g.rect(hx + 8, hy - 3, 11, 2, 'E'); g.rect(hx + 9, hy - 3, 9, 1, 'F'); g.rect(hx + 10, hy - 4, 7, 1, 'D');                   // Kamm
      g.rect(hx, hy + 9, 15, 4, 'T'); g.rect(hx, hy + 10, 13 - Math.max(0, hd) * 2, 2, awake ? 'V' : 'g');                // Visier
      if (awake) { g.rect(hx + (hd > 0 ? 4 : 1), hy + 10, 4, 1, 'W'); }
      g.rect(hx + 16, hy + 6, 2, 9, 'P'); g.rect(hx + 16, hy + 6, 1, 9, 'Q'); g.rect(hx + 1, hy + 15, 13, 1, 'h'); for (let x = hx + 2; x < hx + 13; x += 3) g.set(x, hy + 16, 'T');   // Wangenplatte, Kiefer
      g.set(hx + 20, hy + 2, 'p'); g.set(hx + 21, hy + 2, 'o'); g.set(hx + 21, hy + 1, 'p');
    }
    if (stage >= 4) {   // ---- Schulterpanzer ----
      plate(26, 18 + B, 56, 38 + B, 3, 2); g.rect(28, 30 + B, 27, 3, 'P'); g.rect(28, 30 + B, 27, 1, 'Q'); g.rect(28, 33 + B, 27, 1, 'O');
      g.rect(28, 20 + B, 26, 1, 'l'); for (const x of [31, 39, 47, 53]) { g.set(x, 25 + B, 'D'); g.set(x, 35 + B, 'D'); }
      for (const [x, y] of [[29, 17], [30, 16], [34, 17], [41, 16], [42, 17], [50, 17]]) { g.set(x, y + B, 'p'); g.set(x + 1, y + B, 'o'); g.set(x, y + 1 + B, 'n'); }   // Moos vom alten Steingolem
    }
    return g.rows();
  }
  // Riesen-Mecha von vorn (nach deiner Vorlage): kugelige Schulterpanzer, Kuppelkopf mit Gitter und Visier, dunkler Rumpf,
  // riesige dunkle Fäuste, kurze gegliederte Beine, orange Versorgungsschläuche über den Schultern
  function mechaFront(stage, p) {
    p = p || {}; const B = p.bob || 0, hd = p.head || 0, sw = p.swing || 0, rz = p.raise || 0, awake = p.awake === undefined ? stage >= 6 : p.awake;
    const rzOf = s => s < 0 ? (p.rL === undefined ? rz : p.rL) : (p.rR === undefined ? rz : p.rR), swOf = s => s * sw + (s > 0 ? (p.wv || 0) : 0);   /* Arme einzeln heben, rechter Arm winkt */
    const g = Grid(90, 100), CX = 45;   /* 4 px kürzer als früher: kräftige Beine wie draußen, nicht zu kurz */
    const SH = ['g', 'h', 'i', 'j', 'l', 'H'], DK = ['U', 'x', 'T', 'X', 'y', 'Y'], CB = ['a', 'b', 'c', 'd', 'e'];
    const LX = -.55, LY = -.65, LZ = .52, BY = [[0, .5], [.75, .25]];
    const pick = (ramp, l, x, y) => { if (ramp === SH) l -= .18; const n = ramp.length, v = Math.max(0, Math.min(.999, (l + .25) / 1.25)) * n, i = Math.floor(v), f = v - i; return ramp[Math.min(n - 1, i + (f > BY[y & 1][x & 1] + .12 ? 1 : 0))]; };
    const ball = (cx, cy, rx, ry, ramp, rim) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny; if (d > 1) continue;
      const nz = Math.sqrt(1 - d); let l = nx * LX + ny * LY + nz * LZ; if (d > .82 && rim !== false) l -= .35; g.set(x, y, pick(ramp, l, x, y)); } };
    const box = (x0, y0, x1, y1, ramp, bev) => { const w = x1 - x0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const nx = ((x - x0) / Math.max(1, w)) * 2 - 1; let l = -nx * .55 + Math.sqrt(Math.max(0, 1 - nx * nx)) * .5; if (y === y0) l += .3; if (y === y1) l -= .4; if (bev && (x === x0 || x === x1)) l -= .2; g.set(x, y, pick(ramp, l, x, y)); } };
    const ln = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) g.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); };
    const cable = pts => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; ln(a, b - 1, c, d - 1, 'e'); ln(a, b, c, d, 'c'); ln(a, b + 1, c, d + 1, 'b'); } };
    const sym = f => { f(1); f(-1); };
    const X = (s, dx) => CX + s * dx;   // gespiegelte x-Position
    // Stufe 0: Stahlgerüst und Füße
    if (stage < 3) { ln(CX, 18, CX, stage >= 1 ? 60 : 88, 'X'); ln(CX + 1, 18, CX + 1, stage >= 1 ? 60 : 88, 'T'); ln(16, 36, 74, 36, 'X'); sym(s => ln(X(s, 29), 36, X(s, 29), 70, 'X'));
      if (stage < 1) { ln(28, 62, 62, 62, 'X'); sym(s => ln(X(s, 12), 62, X(s, 12), 90, 'X')); }
      for (const [x, y] of [[CX, 36], [16, 36], [74, 36], [35, 62], [55, 62], [CX, 62]]) { g.rect(x - 1, y - 1, 3, 3, 'T'); g.set(x, y, 'E'); } }
    sym(s => { const x0 = s < 0 ? X(s, 23) : X(s, 3); box(x0, 90, x0 + 20, 97, DK, 1); g.rect(x0 + 2, 95, 17, 1, 'U'); g.rect(x0 + 3, 91, 15, 1, 'y'); });   /* breite Füße */
    if (stage >= 1) {   // Beine (gegliedert) und Becken
      sym(s => { const x0 = s < 0 ? X(s, 20) : X(s, 5); box(x0, 66 + B, x0 + 15, 74, SH, 1); box(x0 + 1, 75, x0 + 14, 77, DK); box(x0, 78, x0 + 15, 84, SH, 1); box(x0 + 1, 85, x0 + 14, 86, DK); box(x0, 86, x0 + 15, 90, SH, 1);   /* kurze, kräftige Beine */
        g.rect(x0 + 3, 70 + B, 10, 1, 'g'); g.rect(x0 + 5, 80, 6, 2, 'g'); });
      box(26, 60 + B, 64, 68 + B, DK, 1); g.rect(38, 62 + B, 15, 4, 'h'); g.rect(39, 62 + B, 13, 1, 'j'); g.rect(CX - 1, 63 + B, 3, 2, 'D');
    }
    if (stage >= 2) {   // Rumpf: dunkle Tonne, helle Brustplatte, Energiekern
      ball(CX, 47 + B, 20, 17, DK); for (let y = 52; y < 62; y += 2) g.rect(CX - 10, y + B, 21, 1, 'U');
      sym(s => { box(s < 0 ? CX - 19 : CX + 12, 40 + B, s < 0 ? CX - 12 : CX + 19, 56 + B, DK, 1); for (let y = 42; y < 56; y += 4) g.set(X(s, 16), y + B, 'Y'); });   // seitliche Panzerplatten mit Nieten
      box(CX - 10, 38 + B, CX + 10, 52 + B, SH, 1); g.rect(CX - 10, 45 + B, 21, 1, 'h'); for (const x of [CX - 8, CX + 8]) { g.set(x, 40 + B, 'g'); g.set(x, 50 + B, 'g'); }
      const cy = 46 + B; for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = x * x + y * y; if (d > 17) continue; g.set(CX + x, cy + y, d <= 2 ? (awake ? 'G' : 'h') : d <= 7 ? (awake ? 'W' : 'g') : d <= 12 ? (awake ? 'V' : 'U') : 'C'); }
    }
    if (stage >= 3) {   // Arme mit riesigen Fäusten, Versorgungsschläuche
      sym(s => { const ax = X(s, 31), sx = swOf(s); box(ax - 5, 42 + B, ax + 5, 54 + B, DK, 1);                                    // Oberarm
        const fy = 54 + B - rzOf(s) * 8; box(ax - 8 + sx, fy, ax + 8 + sx, fy + 13, SH, 1); g.rect(ax - 7 + sx, fy + 9, 15, 2, 'h'); g.rect(ax - 7 + sx, fy + 3, 15, 1, 'j');   // Unterarm
        const hx = ax + sx, hy = fy + 14, bl = s > 0 ? (p.blade || 0) : 0;
        if (bl > 0) {   // Klinge statt Hand: Hand ist eingefahren, eine Stahlklinge fährt aus dem Unterarm
          box(hx - 5, hy - 1, hx + 5, hy + 1, DK, 1); g.rect(hx - 4, hy - 1, 9, 1, 'D');
          const L = Math.min(Math.round(bl * 30), 96 - (hy + 2));   /* Klinge endet über dem Boden */ for (let y = 0; y < L; y++) { const w = y > L - 7 ? Math.max(0, Math.round((L - y) * .6)) : 4; for (let x = -w; x <= w; x++) g.set(hx + x, hy + 2 + y, x === -w ? 'J' : x < 0 ? 'H' : x === w ? 'i' : 'l'); }
          if (L > 4) g.rect(hx, hy + 2, 1, L - 5, 'j'); }   // Mittelgrat
        else {   // Roboterhand: Handgelenk, Handrücken mit Bolzen, drei Finger mit Gelenk, Daumen innen
          box(hx - 5, hy, hx + 5, hy + 2, DK, 1); g.rect(hx - 4, hy + 1, 9, 1, 'U');
          box(hx - 8, hy + 3, hx + 8, hy + 11, SH, 1); g.rect(hx - 7, hy + 7, 15, 1, 'h'); g.set(hx - 6, hy + 5, 'D'); g.set(hx + 6, hy + 5, 'D'); g.set(hx - 6, hy + 9, 'C'); g.set(hx + 6, hy + 9, 'C');
          for (const i of [-1, 0, 1]) { const x0 = hx + i * 5 - 1; box(x0, hy + 12, x0 + 3, hy + 15, DK, 1); g.rect(x0, hy + 16, 4, 1, 'U'); box(x0, hy + 17, x0 + 3, hy + 19, SH, 1); g.rect(x0 + 1, hy + 19, 2, 1, 'h'); }
          const tx = s < 0 ? hx + 9 : hx - 11; box(tx, hy + 6, tx + 2, hy + 12, DK, 1); box(tx, hy + 13, tx + 2, hy + 15, SH, 1); } });
      sym(s => cable([[X(s, 12), 30 + B], [X(s, 22), 22 + B], [X(s, 34), 24 + B], [X(s, 41), 34 + B], [X(s, 40), 52 + B - rzOf(s) * 6], [X(s, 38) + swOf(s), 62 + B - rzOf(s) * 8]]));
    }
    if (stage >= 4) {   // kugelige Schulterpanzer mit dunklem Ring
      sym(s => { const cx = X(s, 29), cy = 34 + B; ball(cx, cy, 14, 13, SH); for (let a = 0; a < 6.28; a += .05) { const x = Math.round(cx + Math.cos(a) * 7), y = Math.round(cy + 2 + Math.sin(a) * 6); if (Math.sin(a) > -.2) g.set(x, y, 'h'); }
        g.set(cx - 5, cy - 7, 'H'); g.set(cx - 4, cy - 8, 'H'); });
    }
    if (stage >= 5) {   // Kuppelkopf: Gitter oben, dunkles Gesicht mit Augen
      const hx = CX + hd, hy = 27 + B;
      ball(hx, hy, 11, 11, SH);
      for (let x = hx - 9; x <= hx + 9; x++) g.set(x, hy - 4 - Math.round(Math.sqrt(Math.max(0, 1 - ((x - hx) / 10) ** 2)) * 3), 'h');   // Plattenfuge über die Kuppel
      box(hx - 2, hy - 15, hx + 2, hy - 8, SH); g.rect(hx, hy - 14, 1, 6, 'h'); g.rect(hx - 2, hy - 8, 5, 1, 'g'); g.rect(hx - 1, hy - 16, 3, 1, awake ? 'u' : 'h'); g.set(hx, hy - 17, awake ? 'u' : 'h');   // Sensorfinne mit Signallampe
      for (let y = hy - 1; y <= hy + 8; y++) { const w = y < hy + 5 ? 7 : 7 - (y - hy - 4); g.rect(hx - w, y, 2 * w + 1, 1, y === hy - 1 ? 'x' : 'U'); }   // Gesichtsplatte
      g.set(hx - 4, hy + 1, awake ? 'W' : 'u'); g.set(hx - 3, hy + 1, awake ? 'V' : 'u'); g.set(hx + 3, hy + 1, awake ? 'V' : 'u'); g.set(hx + 4, hy + 1, awake ? 'W' : 'u');   // Augen
    }
    return g.rows();
  }
  // Riesen-Mecha von der Seite (blickt nach links) für das Hinein- und Hinausgehen: gleiche Bauteile und Schattierung wie die Vorderansicht.
  // p.step 0..3 = Schrittbilder (vorderes Bein vor, Mitte mit gehobenem Fuß, zurück, Mitte)
  function mechaSideBig(p) {
    p = p || {}; const g = Grid(86, 100), CX = 42, f = (p.step || 0) % 8, B = f % 4 < 2 ? 1 : 0, awake = p.awake !== false;   /* 8 Schrittbilder: sackt beim Auftreten ab */
    const SH = ['g', 'h', 'i', 'j', 'l', 'H'], DK = ['U', 'x', 'T', 'X', 'y', 'Y'], BY = [[0, .5], [.75, .25]];
    const pick = (ramp, l, x, y) => { if (ramp === SH) l -= .18; const n = ramp.length, v = Math.max(0, Math.min(.999, (l + .25) / 1.25)) * n, i = Math.floor(v), q = v - i; return ramp[Math.min(n - 1, i + (q > BY[y & 1][x & 1] + .12 ? 1 : 0))]; };
    const ball = (cx, cy, rx, ry, ramp, o) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny; if (d > 1) continue; let l = -nx * .55 - ny * .65 + Math.sqrt(1 - d) * .52 - (o || 0); if (d > .82) l -= .35; g.set(x, y, pick(ramp, l, x, y)); } };
    const box = (x0, y0, x1, y1, ramp, o) => { const w = x1 - x0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const nx = ((x - x0) / Math.max(1, w)) * 2 - 1; let l = -nx * .55 + Math.sqrt(Math.max(0, 1 - nx * nx)) * .5 - (o || 0); if (y === y0) l += .3; if (y === y1) l -= .4; if (x === x0 || x === x1) l -= .2; g.set(x, y, pick(ramp, l, x, y)); } };
    const ln = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) g.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); };
    const cable = pts => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; ln(a, b - 1, c, d - 1, 'e'); ln(a, b, c, d, 'c'); ln(a, b + 1, c, d + 1, 'b'); } };
    /* 8 Bilder pro Doppelschritt: der stehende Fuß wandert gleichmäßig 6 px pro Bild nach hinten (der Körper rückt gleich weit vor), der andere schwingt angehoben nach vorn */
    const S8 = 12, legAt = ph => ph < .5 ? { x: Math.round(-S8 + ph * 4 * S8), up: 0 } : (q => ({ x: Math.round(S8 - q * 2 * S8), up: Math.round(Math.sin(q * Math.PI) * 5) }))((ph - .5) * 2);
    const LF = legAt(f / 8), LB = legAt((f / 8 + .5) % 1), st = LF.x;
    const leg = (dx, lift, o) => { const t = Math.round(dx * .35), s2 = Math.round(dx * .7);   // Oberschenkel, Knie, Schienbein, Stiefel mit Zehenkappe
      box(CX - 6 + t, 66 + B, CX + 9 + t, 74, SH, o); g.rect(CX - 5 + t, 70 + B, 14, 1, o ? 'g' : 'h');   /* kräftig wie in der Vorderansicht */
      box(CX - 5 + s2, 75 - lift, CX + 8 + s2, 77 - lift, DK, o);
      box(CX - 6 + s2, 78 - lift, CX + 9 + s2, 87 - lift, SH, o); g.rect(CX - 5 + s2, 81 - lift, 14, 2, o ? 'g' : 'h'); g.rect(CX + 5 + s2, 79 - lift, 2, 7, 'P');
      box(CX - 11 + dx, 88 - lift, CX + 11 + dx, 97 - lift, DK, o); g.rect(CX - 10 + dx, 95 - lift, 21, 1, 'U'); g.rect(CX - 11 + dx, 88 - lift, 23, 1, o ? 'T' : 'y');
      if (!o) { g.rect(CX - 10 + dx, 95 - lift, 3, 4, 'D'); g.rect(CX - 10 + dx, 95 - lift, 3, 1, 'E'); } };
    const hand = (hx, hy, o) => {   // Roboterhand von der Seite: Gelenk, Handblock, drei Finger, Daumen hinten
      box(hx - 4, hy, hx + 4, hy + 2, DK, o); box(hx - 6, hy + 3, hx + 6, hy + 11, SH, o); g.rect(hx - 5, hy + 7, 11, 1, o ? 'g' : 'h'); if (!o) g.set(hx - 4, hy + 5, 'D');
      [[hx - 6, 0, .2], [hx - 2, 1, 0], [hx + 2, 0, .35]].forEach(([x0, ext, dk]) => { const oo = o || dk > .3 ? 1 : 0; box(x0, hy + 12, x0 + 2, hy + 15, DK, oo); g.rect(x0, hy + 16, 3, 1, 'U'); box(x0, hy + 17, x0 + 2, hy + 19 + ext, dk > .1 && !o ? DK : SH, o); });   /* drei Finger mit Gelenk, der mittlere am längsten */
      box(hx + 4, hy + 8, hx + 6, hy + 14, DK, o); };
    const arm = (sw, o) => { const ax = CX + 4; box(ax - 5, 42 + B, ax + 5, 54 + B, DK, o); g.rect(ax - 4, 47 + B, 9, 1, 'U');                     // Oberarm
      const fx = ax + Math.round(sw * .5); box(fx - 7, 54 + B, fx + 7, 67 + B, SH, o); g.rect(fx - 6, 63 + B, 13, 2, o ? 'g' : 'h'); g.rect(fx - 6, 57 + B, 13, 1, o ? 'h' : 'j');   // Unterarm
      hand(ax + sw, 68 + B, o); };
    leg(LB.x, LB.up, .55);                                                                                                  // hinteres Bein im Schatten
    arm(-LB.x, .5);                                                                                                            // hinterer Arm
    ball(CX + 14, 33 + B, 11, 11, SH, .5);                                                                                  // hinterer Schulterpanzer
    box(CX + 14, 34 + B, CX + 24, 58 + B, DK); for (let y = 37; y < 56; y += 4) g.rect(CX + 16, y + B, 7, 1, 'U');           // Tornister am Rücken
    for (const x of [CX + 16, CX + 21]) { box(x, 22 + B, x + 2, 34 + B, DK); g.rect(x - 1, 21 + B, 5, 2, 'X'); }             // Auspuff
    box(CX - 12, 60 + B, CX + 16, 68 + B, DK); g.rect(CX - 10, 62 + B, 6, 3, 'D'); g.rect(CX - 9, 62 + B, 4, 1, 'E');       // Becken
    ball(CX + 2, 47 + B, 17, 17, DK); for (let y = 54; y < 62; y += 2) g.rect(CX - 8, y + B, 20, 1, 'U');                  // Rumpf (dunkle Tonne)
    box(CX - 2, 39 + B, CX + 12, 56 + B, DK, -.1); for (const [x, y] of [[CX, 41], [CX + 10, 41], [CX, 54], [CX + 10, 54]]) g.set(x, y + B, 'Y');   // Seitenpanzer mit Nieten
    box(CX - 16, 37 + B, CX - 9, 53 + B, SH); g.rect(CX - 16, 45 + B, 8, 1, 'h');                                           // Brustplatte vorn
    for (let y = -4; y <= 4; y++) for (let x = 0; x <= 3; x++) { const d = x * x * 2 + y * y; if (d > 17) continue; g.set(CX - 17 + x, 46 + B + y, d <= 3 ? (awake ? 'G' : 'h') : d <= 8 ? (awake ? 'W' : 'g') : (awake ? 'V' : 'U')); }   // Energiekern von der Seite
    cable([[CX - 10, 36 + B], [CX - 6, 26 + B], [CX + 6, 22 + B], [CX + 16, 30 + B], [CX + 18, 40 + B]]);                     // Versorgungsschlauch über die Schulter
    leg(LF.x, LF.up, 0);                                                                                                     // vorderes Bein
    ball(CX + 4, 34 + B, 14, 13, SH); for (let a = 0; a < 6.28; a += .04) { const x = Math.round(CX + 4 + Math.cos(a) * 7), y = Math.round(36 + B + Math.sin(a) * 6); if (Math.sin(a) > -.2) g.set(x, y, 'h'); } g.set(CX - 2, 26 + B, 'H'); g.set(CX - 1, 25 + B, 'H');   // vorderer Schulterpanzer
    const hx = CX - 10, hy = 26 + B; ball(hx, hy, 10, 10, SH);                                                              // Kuppelkopf vor der Schulter
    for (let x = hx - 8; x <= hx + 8; x++) g.set(x, hy - 4 - Math.round(Math.sqrt(Math.max(0, 1 - ((x - hx) / 9) ** 2)) * 3), 'h');   // Plattenfuge
    box(hx - 1, hy - 15, hx + 3, hy - 8, SH); g.rect(hx + 1, hy - 14, 1, 6, 'h'); g.rect(hx, hy - 16, 3, 1, awake ? 'u' : 'h'); g.set(hx + 1, hy - 17, awake ? 'u' : 'h');   // Sensorfinne
    for (let y = hy - 1; y <= hy + 8; y++) { const w = y < hy + 5 ? 8 : 8 - (y - hy - 4); g.rect(hx - 10, y, w, 1, y === hy - 1 ? 'x' : 'U'); }   // Gesicht vorn
    g.set(hx - 9, hy + 2, awake ? 'W' : 'u'); g.set(hx - 8, hy + 2, awake ? 'W' : 'u'); g.set(hx - 7, hy + 2, awake ? 'V' : 'u');   // ein Auge
    arm(-st, 0);                                                                                                            // vorderer Arm pendelt gegen das vordere Bein
    return g.rows();
  }
  const MSIDE = {}, mechaSidePose = (p, paint) => { const k = [p.step, paint].join(','); return MSIDE[k] || (MSIDE[k] = ART.buildSprite(mechaSideBig(p), ART.paintPal(paint))); };
  const MECHA_F = [0, 1, 2, 3, 4, 5, 6].map(k => S(mechaFront(k)));
  const MECHA_FP = {}, mechaFrontPose = (p, paint) => { const k = [p.bob, p.head, p.swing, p.raise, p.rL, p.rR, p.wv, p.awake, p.blade, paint].join(','); return MECHA_FP[k] || (MECHA_FP[k] = ART.buildSprite(mechaFront(6, p), ART.paintPal(paint))); };   /* gecacht je Pose und Lackierung */
  const MECHA = [0, 1, 2, 3, 4, 5, 6].map(k => S(mechaGrid(k)));
  /* Bauteil, das als Nächstes angebaut wird: Unterschied zwischen Bauabschnitt k und k + 1, auf das Teil zugeschnitten (hängt am Portalkran) */
  const MNEXT = [0, 1, 2, 3, 4, 5].map(k => { const A = mechaFront(k), B = mechaFront(k + 1),   /* aus der Vorderansicht, die man im Kraftwerk sieht */ D = B.map((r, y) => [...r].map((c, x) => c !== '.' && c !== A[y][x] ? c : '.'));
    { const H2 = D.length, W2 = D[0].length, lab = D.map(r => r.map(() => 0)); let best = 0, bestN = 0, id = 0;   /* nur das größte zusammenhängende Stück (z. B. ein Arm, nicht beide) */
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (D[y][x] !== '.' && !lab[y][x]) { id++; let n = 0; const st = [[x, y]]; lab[y][x] = id;
        while (st.length) { const [cx, cy] = st.pop(); n++; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < W2 && ny < H2 && !lab[ny][nx] && D[ny][nx] !== '.') { lab[ny][nx] = id; st.push([nx, ny]); } } }
        if (n > bestN) { bestN = n; best = id; } }
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (lab[y][x] !== best) D[y][x] = '.'; }
    const cnt = (y0, y1, x0, x1) => { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (D[y][x] !== '.') n++; return n; };
    let y0 = 0, y1 = D.length - 1, x0 = 0, x1 = D[0].length - 1; while (y0 < y1 && !cnt(y0, y0, x0, x1)) y0++; while (y1 > y0 && !cnt(y1, y1, x0, x1)) y1--; while (x0 < x1 && !cnt(y0, y1, x0, x0)) x0++; while (x1 > x0 && !cnt(y0, y1, x1, x1)) x1--;
    return S(D.slice(y0, y1 + 1).map(r => r.slice(x0, x1 + 1).join(''))); });
  MNEXT[5] = S((() => { const g = Grid(12, 16);   /* letzter Schritt: Energiezelle für den Kern (Stahlgehäuse mit leuchtendem Fenster) */
    g.rect(3, 0, 6, 2, 'X'); g.rect(4, 0, 4, 1, 'Z'); g.rect(1, 2, 10, 13, 'Y'); g.rect(1, 2, 2, 13, 'Z'); g.rect(1, 2, 1, 13, 'l'); g.rect(9, 2, 2, 13, 'X'); g.rect(10, 2, 1, 13, 'T');
    g.rect(4, 4, 4, 8, 'F'); g.rect(5, 5, 2, 6, 'G'); g.rect(4, 4, 4, 1, 'E'); g.rect(1, 15, 10, 1, 'T'); g.rect(1, 3, 10, 1, 'X'); g.rect(1, 13, 10, 1, 'X'); return g.rows(); })());
  const MECHA_POSE = {}, mechaPose = p => { const k = [p.bob, p.head, p.swing, p.raise].join(','); return MECHA_POSE[k] || (MECHA_POSE[k] = S(mechaGrid(6, p))); };
  // Energiekapsel nach Art des Tilesets: Sockel, Glaszylinder mit Blitz, Deckel
  function capsule(c1, c2, c3) {   // Energiekapsel: Metallkappe, Glaszylinder mit Glanz, Blitz, gerippter Sockel
    const g = Grid(16, 40), RAMPC = { V: ['C', 'D', 'V', 'E', 'W', 'G'], o: ['m', 'n', 'o', 'p', 'q', 'r'], y: ['x', 'y', 'z', 'A', 'B', 'J'] }[c1];
    shCylV(g, 2, 0, 13, 5, 'metal'); g.rect(4, 1, 8, 1, 'Z'); shCylV(g, 5, 5, 10, 6, 'dark');
    shCylV(g, 2, 7, 13, 27, RAMPC); for (let y = 8; y < 27; y++) { g.set(4, y, 'J'); if (y % 3) g.set(5, y, 'B'); } g.rect(2, 7, 12, 1, 'T'); g.rect(2, 27, 12, 1, 'T');
    ['...WW', '..WW.', '.WWWW', '..WW.', '.WW..'].forEach((r, y) => { for (let x = 0; x < 5; x++) if (r[x] === 'W') g.set(6 + x, 13 + y, 'G'); });
    shCylV(g, 1, 28, 14, 32, 'steel'); shCylV(g, 0, 33, 15, 39, 'metal'); for (let x = 3; x < 13; x += 2) g.rect(x, 35, 1, 3, 'T'); g.set(3, 34, c1); g.set(12, 34, c1);
    return S(g.rows());
  }
  const CAPS = [capsule('V', 'W', 'E'), capsule('o', 'q', 'r'), capsule('y', 'A', 'B')], CAPC = ['#ffb04a', '#9cff7a', '#7fd4ff'];
  const GANTRY = S((() => { const g = Grid(124, 8); g.rect(0, 0, 124, 2, 'E'); g.rect(0, 2, 124, 4, 'D'); g.rect(0, 6, 124, 2, 'C'); for (let x = 2; x < 122; x += 6) { g.set(x, 3, 'C'); g.set(x + 1, 4, 'C'); g.set(x + 2, 3, 'C'); } return g.rows(); })());
  const TOWER = S((() => { const g = Grid(10, 112); for (let y = 0; y < 112; y++) { g.set(0, y, 'D'); g.set(9, y, 'C'); if (y % 12 < 1) g.rect(0, y, 10, 1, 'D'); const d = y % 12; g.set(1 + Math.floor(d * 8 / 12), y, 'C'); } return g.rows(); })());
  const PLATFORM = w => S((() => { const g = Grid(w, 6); g.rect(0, 0, w, 2, 'i'); g.rect(0, 0, w, 1, 'l'); for (let x = 0; x < w; x += 3) g.set(x, 1, 'h'); g.rect(0, 2, w, 1, 'g'); for (let x = 1; x < w; x += 8) g.rect(x, 3, 1, 3, 'h'); g.rect(0, 5, w, 1, 'h'); return g.rows(); })());
  const PLAT_L = PLATFORM(30), PLAT_R = PLATFORM(26);
  const MPART = S((() => { const g = Grid(18, 10); fill(g, 0, 0, 18, 10, 'stone', 2); g.rect(2, 7, 14, 1, 'E'); g.rect(1, 1, 16, 1, 'l'); return g.rows(); })());
  const SWITCHBOARD = S(relight((() => { const g = Grid(46, 44); fill(g, 0, 0, 46, 44, 'metal', 1); for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) { const x = 4 + k * 14, y = 4 + j * 18; g.rect(x, y, 10, 10, 'J'); g.rect(x, y, 10, 1, 'j'); g.set(x + 5, y + 5, 'a'); } for (let i = 0; i < 6; i++) g.rect(4 + i * 7, 38, 3, 3, i % 2 ? 'q' : 'u'); return g.rows(); })()));

  // Lagergut: Holzkiste mit Griffloch, blaue Kiste mit Etikett, Stangenbündel
  function shelfItem(g, x, y, w, h, kind) {
    if (kind === 0) { part(g, x, y, w, h, 'wood', 4); g.rect(x + 1, y + Math.floor(h / 2), w - 2, 1, 'c'); g.rect(x + Math.floor(w / 2) - 1, y + 2, 3, 1, 'a'); }
    else if (kind === 1) { part(g, x, y + 2, w, h - 2, 'blue', 2); g.rect(x + 2, y + 4, w - 4, 2, 'J'); g.rect(x + 3, y + 5, w - 7, 1, 'i'); g.rect(x, y + 2, w, 1, 'B'); }
    else { for (let i = 0; i < w - 1; i += 3) { g.rect(x + i, y + 2, 2, h - 2, 'Y'); g.set(x + i, y + 2, 'l'); g.set(x + i + 1, y + 2, 'Z'); g.rect(x + i + 1, y + 3, 1, h - 3, 'X'); } g.rect(x, y + h - 3, w - 1, 1, 'u'); }
  }
  // Regal / Teilelager
  function shelfGrid(level, broken) {
    const g = Grid(46, 58);
    for (const x of [0, 43]) fill(g, x, 0, 3, 58, 'wood', 3);
    for (let k = 0; k < 4; k++) { if (broken && k === 1) { for (let i = 0; i < 46; i++) g.set(i, 10 + k * 13 + Math.floor(i / 8), 'c'); continue; } fill(g, 0, 10 + k * 13, 46, 2, 'wood', 3); }
    const slots = broken ? 1 : [2, 4, 7, 10][level];
    let n = 0;
    for (let k = 3; k >= 0 && n < slots; k--) for (let j = 0; j < 3 && n < slots; j++, n++) {
      const x = 4 + j * 13, y = 10 + k * 13 - 8;
      shelfItem(g, x, y, 11, 8, (n + k) % 3);
    }
    return g;
  }
  const SHELF = [0, 1, 2, 3].map(l => G2S(shelfGrid(l))), SHELF_B = G2S(brokenOf(shelfGrid(0, true), 2));

  // ---------- Einrichtung ----------
  const mkPeg = hammer => S(relight((() => { const g = Grid(38, 24); fill(g, 0, 0, 38, 24, 'wood', 4); for (let y = 2; y < 24; y += 3) for (let x = 2; x < 38; x += 3) g.set(x, y, 'c');
    if (hammer) { g.rect(3, 4, 2, 10, 'c'); g.rect(1, 3, 6, 3, 'h'); } else g.rect(3, 4, 2, 1, 'b'); g.rect(10, 3, 2, 12, 'i'); g.rect(9, 3, 4, 2, 'j'); g.rect(9, 13, 4, 2, 'j');
    g.rect(16, 4, 9, 6, 'j'); g.rect(16, 9, 9, 1, 'h'); g.rect(24, 4, 3, 3, 'u'); g.rect(29, 3, 2, 14, 'i'); g.rect(28, 3, 4, 2, 'u'); g.rect(33, 4, 2, 9, 'E'); g.rect(33, 12, 2, 3, 'h');
    g.rect(17, 14, 14, 7, 'O'); g.rect(18, 15, 12, 5, 'P'); g.rect(22, 16, 4, 3, 'Q'); return g.rows(); })()));
  const PEG = mkPeg(true), PEG_E = mkPeg(false);   /* Lochwand mit und ohne Hammer */
  const HAMMER_V = S(['hhhhhh', 'hhhhhh', '..cc..', '..cc..', '..cc..', '..cc..', '..cc..', '..cc..', '..cc..', '..cc..']);   /* Hammer wie an der Wand */
  const HAMMER_L = S(['hh........', 'hhcccccccc', 'hhcccccccc', 'hh........', 'hh........', 'hh........']);   /* liegend: gleiche Form, um 90° gedreht */
  const LOCKER = S(relight((() => { const g = Grid(18, 40); part(g, 0, 0, 18, 38, 'blue', 2); g.rect(8, 1, 2, 36, 'x'); g.rect(9, 1, 1, 36, 'z'); for (const x of [2, 11]) { for (let y = 4; y < 11; y += 2) { g.rect(x, y, 5, 1, 'x'); g.rect(x, y + 1, 5, 1, 'A'); } g.rect(x + 4, 18, 1, 4, 'j'); g.set(x + 4, 18, 'l'); g.rect(x, 26, 5, 3, 'J'); g.rect(x + 1, 27, 3, 1, 'i'); } g.rect(1, 38, 3, 2, 'g'); g.rect(14, 38, 3, 2, 'g'); return g.rows(); })()));
  const EXT = S((() => { const g = Grid(9, 16); shCylV(g, 2, 3, 7, 15, 'red'); shBox(g, 3, 0, 6, 2, 'metal'); g.rect(1, 1, 2, 1, 'T'); g.set(0, 2, 'T');   // Feuerlöscher mit Ventilkopf, Schlauch, Etikett
    for (let y = 4; y < 13; y++) g.set(8, y, y % 2 ? 'T' : 'a'); shBox(g, 3, 7, 6, 10, 'steel'); g.rect(4, 8, 2, 1, 'u'); return g.rows(); })());
  const POSTER = S(['JJJJJJJJJJ', 'JpppppppJJ', 'JppJJpppJJ', 'JpJJJJppJJ', 'JppJJpppJJ', 'JpppppppJJ', 'JaaaaaaaJJ', 'JJJJJJJJJJ']);
  const WARN = S((() => { const g = Grid(13, 12); for (let y = 0; y < 12; y++) { const w = Math.round(1 + y * 1.1); for (let x = 6 - Math.floor(w / 2) ; x <= 6 + Math.floor(w / 2); x++) { const edge = y === 11 || Math.abs(x - 6) >= Math.floor(w / 2) - 0; g.set(x, y, edge ? 'a' : tone('gold', .5 - y * .05 - (x - 6) * .04, x, y)); } }
    g.rect(6, 4, 1, 4, 'a'); g.set(6, 9, 'a'); return g.rows(); })());
  const CLOCK = S((() => { const g = Grid(12, 12); shBall(g, 6, 6, 6, 6, 'metal'); for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) if ((x - 5.5) ** 2 + (y - 5.5) ** 2 < 15) g.set(x, y, 'J');
    for (const [x, y] of [[5, 2], [9, 5], [5, 9], [2, 5]]) g.set(x, y, 'h'); g.rect(5, 3, 1, 3, 'a'); g.rect(5, 5, 3, 1, 'a'); g.set(6, 6, 'u'); g.set(3, 3, 'l'); return g.rows(); })());
  const SHEETS = S(relight((() => { const g = Grid(40, 16); for (let k = 0; k < 6; k++) { g.rect(1 + (k % 2), 2 + k * 2, 37, 1, 'B'); g.rect(1 + (k % 2), 3 + k * 2, 37, 1, 'A'); } part(g, 0, 13, 40, 3, 'wood', 3); g.rect(4, 15, 4, 1, 'a'); g.rect(32, 15, 4, 1, 'a'); return g.rows(); })()));   // Blechstapel in denselben Farben wie das gehobene Blech
  const LEAN = S(relight(['..Z', '.ZY', 'ZYY', 'ZYZ', 'ZYZ', 'ZYZ', 'ZYZ', 'ZYZ', 'ZYZ', 'ZYZ', 'ZYZ', 'ZYZ', 'ZYZ', 'ZY.', 'Z..']));
  const BARRELS = S((() => { const g = Grid(17, 12); shCylV(g, 0, 1, 7, 11, 'blue'); shCylV(g, 9, 0, 16, 11, 'red');   // zwei Fässer mit Sicken und Deckel
    for (const [x0, c] of [[0, 'x'], [9, 's']]) { g.rect(x0, 4, 8, 1, c); g.rect(x0, 8, 8, 1, c); } g.rect(1, 1, 6, 1, 'A'); g.rect(10, 0, 6, 1, 'v'); g.set(13, 0, 'T'); return g.rows(); })());
  const TROLLEY = S(['g..............', 'g..............', 'gEEEEEEEEEEEEE.', 'gDDDDDDDDDDDDDD', 'g.ZZZZ..Z......', '.gggggggggggggg', '..gh.......gh..']);
  const BROOM = S(['.d.', '.d.', '.d.', '.d.', '.d.', '.d.', '.d.', '.d.', 'EEE', 'DDD', 'EDE']);
  const BEAM = S(['F'.repeat(380), 'E'.repeat(380), 'DCDDDCDDDC'.repeat(38), 'E'.repeat(380), 'C'.repeat(380)]);
  const TROLLEYC = S(['hhhhhhhh', 'hiiiiiih', '.gEEEEg.', '..g..g..']);
  const HOOK = S(['.hh.', 'h..h', '...h', '.hh.']);
  const BENCH = S(relight((() => { const g = Grid(40, 22); part(g, 0, 6, 40, 4, 'wood', 4); g.rect(1, 7, 38, 1, 'f'); for (const x of [2, 35]) part(g, x, 10, 3, 12, 'wood', 2); part(g, 5, 14, 30, 2, 'wood', 2); part(g, 7, 1, 9, 5, 'metal', 2); g.rect(8, 0, 7, 1, 'X'); g.rect(10, 2, 3, 1, 'T'); g.rect(16, 3, 3, 1, 'h'); part(g, 24, 2, 11, 4, 'teal', 1); g.rect(27, 1, 5, 1, 'h'); g.rect(25, 3, 9, 1, 'O'); g.rect(20, 5, 3, 1, 'u'); g.set(22, 4, 'j'); return g.rows(); })()));
  const LAMP = S((() => { const g = Grid(9, 9); g.rect(4, 0, 1, 3, 'g'); shCylV(g, 3, 3, 5, 4, 'metal'); for (let y = 4; y < 8; y++) { const w = 2 + (y - 4) * 1; for (let x = 4 - w; x <= 4 + w; x++) g.set(x, y, tone('teal', .55 - (x - 4 + w) / (2 * w) * .9 - y * .02, x, y)); } g.rect(0, 7, 9, 1, 'O'); g.rect(2, 8, 5, 1, 'W'); return g.rows(); })());
  const TUBE = S((() => { const g = Grid(12, 5); g.set(2, 0, 'g'); g.set(9, 0, 'g'); g.set(2, 1, 'g'); g.set(9, 1, 'g'); shBox(g, 0, 2, 11, 3, 'steel'); g.rect(1, 4, 10, 1, 'W'); g.set(0, 4, 'h'); g.set(11, 4, 'h'); return g.rows(); })());
  const CRATE = S((() => { const g = Grid(12, 8); shBox(g, 0, 0, 11, 7, 'wood'); g.rect(1, 3, 10, 1, 'c'); g.rect(2, 1, 1, 6, 'c'); g.rect(9, 1, 1, 6, 'c'); g.rect(3, 2, 6, 1, 'Z'); return g.rows(); })());
  const CHIPS = S(['..Y.Z...Y..Z.Y..', '.ZYZ.YZ.ZYZ.YZY.', 'YZYZYZYZYZYZYZYZ']);
  // Pförtnerhaus
  const DESK = S(relight((() => { const g = Grid(70, 34); fill(g, 0, 14, 70, 4, 'wood', 4); fill(g, 2, 18, 30, 16, 'wood', 2); for (let y = 21; y < 33; y += 4) g.rect(5, y, 24, 1, 'b'); g.rect(26, 23, 3, 1, 'E'); g.rect(26, 27, 3, 1, 'E'); for (const x of [64]) fill(g, x, 18, 4, 16, 'wood', 2);
    for (const x of [8, 34]) { fill(g, x, 0, 20, 13, 'stone', 1); g.rect(x + 2, 2, 16, 9, 'U'); g.rect(x + 9, 13, 2, 1, 'g'); }
    g.rect(56, 10, 6, 4, 'J'); g.rect(57, 9, 4, 1, 'u'); g.rect(44, 12, 10, 2, 'i'); return g.rows(); })()));
  const CHAIR = S((() => { const g = Grid(16, 24);   /* Bürostuhl: hohe gepolsterte Lehne mit Kopfstütze und Ziernaht, Armlehnen, Chrom-Gasfeder, Fünfsternfuß mit Rollen */
    shBox(g, 3, 0, 11, 3, 'dark'); g.rect(5, 1, 5, 1, 'x');                                        // Kopfstütze
    shBox(g, 2, 4, 12, 13, 'dark'); for (let y = 5; y < 13; y += 3) g.rect(4, y, 7, 1, 'T'); g.rect(7, 5, 1, 8, 'P'); g.rect(3, 5, 1, 8, 'Q');   // Rückenlehne mit Steppung und türkiser Ziernaht
    shBox(g, 1, 13, 13, 15, 'dark'); g.rect(2, 13, 11, 1, 'x');                                     // Sitzpolster
    for (const x of [0, 13]) { g.rect(x, 10, 2, 1, 'X'); g.rect(x + (x ? 0 : 1), 11, 1, 3, 'T'); }    // Armlehnen
    g.rect(7, 16, 1, 4, 'l'); g.rect(8, 16, 1, 4, 'Y'); g.rect(6, 16, 3, 1, 'X');                   // Gasfeder (Chrom)
    g.rect(1, 20, 13, 1, 'X'); g.rect(3, 19, 9, 1, 'T');                                            // Fünfsternfuß
    for (const x of [1, 7, 13]) { g.rect(x, 21, 2, 2, 'U'); g.set(x, 21, 'T'); }                   // Rollen
    return g.rows(); })());
  /* Bürostuhl von allen Seiten (für die Drehung): schräg vorn, Seite, schräg hinten, hinten; Fuß bleibt gleich */
  const chairBase = g => { g.rect(7, 16, 1, 4, 'l'); g.rect(8, 16, 1, 4, 'Y'); g.rect(6, 16, 3, 1, 'X'); g.rect(1, 20, 13, 1, 'X'); g.rect(3, 19, 9, 1, 'T'); for (const x of [1, 7, 13]) { g.rect(x, 21, 2, 2, 'U'); g.set(x, 21, 'T'); } };
  const CHAIR_V = {
    f34: S((() => { const g = Grid(16, 24); shBox(g, 4, 0, 10, 3, 'dark'); g.rect(3, 4, 1, 10, 'U'); shBox(g, 4, 4, 11, 13, 'dark'); for (let y = 5; y < 13; y += 3) g.rect(5, y, 5, 1, 'T'); g.rect(8, 5, 1, 8, 'P');
      shBox(g, 2, 13, 12, 15, 'dark'); g.rect(3, 13, 9, 1, 'x'); g.rect(1, 10, 2, 1, 'X'); g.rect(2, 11, 1, 3, 'T'); g.rect(12, 10, 1, 1, 'X'); chairBase(g); return g.rows(); })()),
    s: S((() => { const g = Grid(16, 24); shBox(g, 3, 0, 6, 3, 'dark'); for (let y = 4; y < 14; y++) { g.set(3, y, 'U'); g.set(4, y, 'T'); g.set(5, y, 'x'); g.set(6, y, 'P'); }
      shBox(g, 3, 13, 13, 15, 'dark'); g.rect(4, 13, 9, 1, 'x'); g.rect(6, 10, 6, 1, 'X'); g.rect(7, 11, 1, 2, 'T'); g.rect(10, 11, 1, 2, 'T'); chairBase(g); return g.rows(); })()),
    b34: S((() => { const g = Grid(16, 24); shBox(g, 5, 0, 11, 3, 'dark'); for (let y = 4; y < 14; y++) for (let x = 5; x < 12; x++) g.set(x, y, x === 5 ? 'X' : x === 11 ? 'U' : (y === 4 ? 'X' : 'T')); g.rect(12, 4, 1, 10, 'U'); g.rect(8, 5, 1, 8, 'U');
      shBox(g, 3, 13, 13, 15, 'dark'); g.rect(13, 10, 2, 1, 'X'); g.rect(13, 11, 1, 3, 'T'); chairBase(g); return g.rows(); })()),
    b: S((() => { const g = Grid(16, 24); shBox(g, 3, 0, 11, 3, 'dark'); for (let y = 4; y < 14; y++) for (let x = 2; x < 13; x++) g.set(x, y, x === 2 ? 'X' : x === 12 ? 'U' : (y === 4 ? 'X' : 'T')); g.rect(7, 5, 1, 8, 'U'); g.rect(4, 12, 7, 1, 'U');
      shBox(g, 1, 13, 13, 15, 'dark'); for (const x of [0, 13]) { g.rect(x, 10, 2, 1, 'X'); g.rect(x + (x ? 0 : 1), 11, 1, 3, 'T'); } chairBase(g); return g.rows(); })())
  };
  let DESK_O = { x: 0, y: 0 };
  const KEYS = S(relight((() => { const g = Grid(26, 15); fill(g, 0, 0, 26, 15, 'wood', 3); for (let i = 0; i < 5; i++) g.set(3 + i * 5, 2, 'h'); return g.rows(); })()));   /* Schlüsselbrett: 5 Haken, einer pro Bereich */
  const COFFEE = S((() => { const g = Grid(8, 10); shBox(g, 0, 0, 7, 9, 'metal'); g.rect(2, 2, 4, 1, 'U'); g.set(2, 2, 'q'); g.rect(1, 4, 6, 3, 'U'); shCylV(g, 3, 5, 4, 6, ['s', 't', 'J', 'H']); g.rect(0, 8, 8, 1, 'Y'); return g.rows(); })());
  const PLANT = S((() => { const g = Grid(9, 12); for (const [x, y, r] of [[3, 2, 2], [6, 3, 2], [4, 4, 3], [2, 5, 2], [6, 6, 2]]) shBall(g, x, y, r, r, ['m', 'n', 'o', 'p', 'q', 'r']);
    shCylV(g, 1, 7, 7, 11, 'red'); g.rect(1, 7, 7, 1, 'v'); return g.rows(); })());
  const BOARD_B = S((() => { const g = Grid(40, 30); fill(g, 0, 0, 40, 30, 'wood', 2); g.rect(2, 2, 36, 26, 'm'); for (let y = 4; y < 27; y += 2) for (let x = 4 + (y % 4); x < 37; x += 4) g.set(x, y, 'n'); return g.rows(); })());
  const BOARD_A = S((() => { const g = Grid(40, 30); fill(g, 0, 0, 40, 30, 'wood', 2); g.rect(2, 2, 36, 26, 'e'); for (let y = 3; y < 28; y += 2) for (let x = 3 + (y % 3); x < 38; x += 3) g.set(x, y, 'd'); return g.rows(); })());
  const NOTE = S(['HHHHHH', 'HjjjjH', 'HHHHHH', 'HjjjHH', 'HHHHHH']);
  // Labor
  const LABBENCH = S((() => { const g = Grid(70, 30); fill(g, 0, 10, 70, 3, 'stone', 4); fill(g, 2, 13, 66, 17, 'plaster', 2); for (const x of [4, 36]) { g.rect(x, 16, 28, 12, 'I'); g.rect(x + 12, 21, 4, 1, 'i'); }
    g.rect(6, 4, 4, 6, 'A'); g.rect(7, 2, 2, 2, 'B'); g.rect(14, 5, 3, 5, 'q'); g.rect(14, 3, 3, 2, 'j'); g.rect(22, 6, 10, 4, 'g'); g.rect(23, 7, 8, 2, 'U'); g.rect(48, 2, 4, 8, 'h'); g.rect(44, 8, 12, 2, 'i'); g.rect(60, 5, 6, 5, 'M'); return g.rows(); })());
  // Messplatz der Qualitätskontrolle: Labortisch mit Granit-Messplatte, Höhenmessgerät, Mikroskop, Monitor, Teileschale
  const QBENCH = S((() => { const g = Grid(84, 36);
    part(g, 0, 14, 84, 4, 'stone', 4); g.rect(1, 15, 82, 1, 'l');                                                  // Arbeitsplatte
    part(g, 2, 18, 30, 18, 'metal', 2); for (const y of [21, 27, 32]) { g.rect(4, y, 26, 1, 'T'); g.rect(15, y + 2, 4, 1, 'Z'); }   // Schubladenschrank
    for (const x of [74, 79]) part(g, x, 18, 3, 18, 'metal', 1); g.rect(33, 30, 46, 2, 'X');
    part(g, 30, 8, 26, 6, 'stone', 1); for (let x = 32; x < 54; x += 5) g.set(x, 10, 'g'); g.rect(31, 9, 24, 1, 'i');   // Granit-Messplatte
    part(g, 50, 0, 3, 8, 'metal', 3); part(g, 48, 7, 7, 2, 'metal', 1);                                            // Säule des Höhenmessgeräts
    part(g, 60, 0, 18, 12, 'metal', 1); screenAt(g, 62, 2, 14, 7); part(g, 67, 12, 4, 2, 'metal', 1);               // Monitor
    part(g, 4, 9, 14, 5, 'teal', 1); for (let i = 0; i < 5; i++) g.rect(6 + i * 2, 10, 1, 3, 'Z');                  // Teileschale
    part(g, 20, 6, 8, 8, 'blue', 2); g.set(23, 8, 'J'); g.set(24, 8, 'a');                                            // Messuhr-Gehäuse
    return g.rows(); })());
  const SCOPE = S(['..gg..', '..hh..', '.hhhh.', '..h...', '..h...', '.hjh..', 'hhhhhh', 'gggggg']);
  // Kraftwerk
  const PIPES = S((() => { const g = Grid(W, 12); shCylH(g, 0, 2, W - 1, 8, 'steel');
    for (let x = 20; x < W; x += 60) { shCylH(g, x, 0, x + 3, 10, 'metal'); shBolt(g, x + 1, 1); shBolt(g, x + 1, 8); }                      // Flansche
    for (let x = 48; x < W; x += 60) { g.rect(x, 0, 2, 2, 'T'); shBox(g, x - 1, 2, x + 2, 8, 'dark'); }                                     // Wandschellen
    for (const x of [96, 276]) { wheel(g, x, 0, 2); g.rect(x, 2, 1, 1, 'h'); shBox(g, x - 2, 3, x + 2, 7, 'red'); }                        // Ventile
    return g.rows(); })());
  const DECO_IN = {};


  // ---------- Pförtnerhaus: Ehrentafel aus Stein, Auftragsbrett ----------
  const BPAL = Object.assign({}, ART.PAL, { k: '#2a5ec8', K: '#4d8cf0', '8': '#9a5a22', '9': '#d68e30' });
  const BADGE_S = {}, BADGE_SG = {};
  Object.keys(window.BADGE_PIX_S || {}).forEach(id => {
    const rows = window.BADGE_PIX_S[id];
    BADGE_S[id] = ART.buildSprite(rows, BPAL);
    BADGE_SG[id] = ART.buildSprite(rows.map(r => r.replace(/[^.]/g, '1')), Object.assign({}, BPAL, { '1': '#58525e' }));   // eingemeißelte Silhouette
  });
  // gleiche Aufteilung wie die Ehrentafel im Seitenbereich: hochkant, 3 Spalten
  const TABLET = S((() => {   // Ehrentafel: polierte Steinplatte mit Fase, gemeißelter Innenrahmen, Messingschild, zweistufiger Sockel
    const g = Grid(66, 88), r = ART.rng(5);
    shBox(g, 0, 0, 65, 75, 'steel'); g.rect(2, 2, 62, 72, 'h'); for (const [x0, y0, n] of [[11, 12, 6], [56, 15, 4], [22, 46, 5], [48, 50, 7], [36, 8, 3], [9, 58, 4]]) { let x = x0, y = y0; for (let k = 0; k < n; k++) { g.set(x, y, 'g'); x += r() < .45 ? (r() < .5 ? 1 : -1) : 0; y++; } }   // ruhiger Stein mit ein paar Rissen
    for (let i = 0; i < 66; i++) { g.set(i, 0, 'j'); g.set(i, 1, 'i'); } for (let j = 0; j < 76; j++) { g.set(0, j, 'j'); g.set(1, j, 'i'); g.set(64, j, 'g'); g.set(65, j, 'U'); } for (let i = 0; i < 66; i++) g.set(i, 75, 'U');
    for (let i = 3; i < 63; i++) { g.set(i, 3, 'g'); g.set(i, 72, 'j'); } for (let j = 3; j < 73; j++) { g.set(3, j, 'g'); g.set(62, j, 'j'); }   // gemeißelter Rahmen
    shBox(g, 19, 5, 46, 10, 'gold', .5); for (let i = 0; i < 22; i += 3) g.rect(22 + i, 7, 2, 1, 'C'); shBolt(g, 20, 6); shBolt(g, 44, 6);
    shBox(g, 6, 76, 59, 79, 'steel', .5); shBox(g, 2, 80, 63, 87, 'steel', .3);
    return g.rows();
  })());
  const SPOT = S((() => { const g = Grid(7, 8); shCylV(g, 2, 1, 5, 4, 'metal'); g.rect(5, 1, 1, 3, 'W'); g.set(6, 2, 'G'); g.rect(3, 5, 1, 2, 'T'); shBox(g, 1, 7, 6, 7, 'dark'); return g.rows(); })());
  const BOARD_O = S((() => {
    const g = Grid(76, 50); fill(g, 0, 0, 76, 50, 'wood', 2); g.rect(0, 0, 76, 1, 'e');
    g.rect(3, 3, 70, 44, 'e'); const r = ART.rng(8); for (let k = 0; k < 160; k++) g.set(3 + Math.floor(r() * 70), 3 + Math.floor(r() * 44), r() < .6 ? 'd' : 'f');
    g.rect(24, 4, 28, 6, 'D'); g.rect(25, 5, 26, 4, 'E'); for (let i = 0; i < 22; i += 3) g.rect(27 + i, 6, 2, 2, 'C');
    // Grundriss-Skizze und Kalender als feste Deko
    g.rect(6, 14, 16, 12, 'H'); for (let i = 0; i < 4; i++) g.rect(8, 16 + i * 2, 10 - i * 2, 1, 'y'); g.rect(8, 23, 12, 1, 'y'); g.set(20, 14, 'u');
    g.rect(6, 30, 14, 14, 'J'); g.rect(6, 30, 14, 3, 'u'); for (let y = 35; y < 43; y += 2) for (let x = 7; x < 19; x += 3) g.rect(x, y, 2, 1, 'i');
    return g.rows();
  })());
  const NOTE2 = S(['....uu....', 'HHHHtuHHHH', 'HiiiiiiiiH', 'HHHHHHHHHH', 'HiiiiiiHHH', 'HHHHHHHHHH', 'HiiiiiiiiH', 'HHHHHHHHHH', 'HZZHYYHHHH', 'HZZHYYHHHH', 'HHHHHHHHHH', 'HHHHHHHHHH']);
  const NOTE_K = S((() => { const g = Grid(9, 9); g.rect(0, 1, 9, 8, 'F'); g.rect(0, 1, 9, 1, 'G'); for (let y = 3; y < 8; y += 2) g.rect(1, y, 6, 1, 'E'); g.set(8, 8, 'D'); g.set(7, 8, 'D'); g.set(8, 7, 'D'); g.set(4, 0, 'u'); return g.rows(); })());   /* klein: gelber Klebezettel mit Eselsohr */
  const NOTE_G = S((() => { const g = Grid(13, 15); g.rect(0, 1, 13, 14, 'z'); g.rect(0, 1, 13, 2, 'u'); for (let x = 1; x < 12; x += 3) for (let y = 4; y < 14; y++) g.set(x, y, 'A'); for (let y = 5; y < 14; y += 3) g.rect(1, y, 11, 1, 'A');
    g.rect(2, 6, 5, 1, 'B'); g.rect(2, 6, 1, 4, 'B'); g.rect(2, 9, 5, 1, 'B'); g.rect(6, 6, 1, 4, 'B'); g.rect(8, 10, 4, 3, 'u'); g.rect(9, 11, 2, 1, 'v'); g.set(6, 0, 'u'); g.set(7, 0, 'u'); return g.rows(); })());   /* groß: Bauplan mit rotem Kopf und Stempel */
  const CHECK = (gx, x, y) => { for (const [dx, dy] of [[0, 2], [1, 3], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0]]) { R(gx, x + dx, y + dy, 1, 1, '#2f8a3a'); R(gx, x + dx, y + dy + 1, 1, 1, '#1e5a26'); } };   /* grüner Haken für erledigte Aufträge */
  const DONE = S(['....uu....', 'HHHHtuHHHH', 'HiiiiiiiiH', 'HHHHHHHHHH', 'HiiiiiHHHH', 'HHHHHHqqHH', 'HHHHHqqHHH', 'HqqHqqHHHH', 'HHqqqHHHHH', 'HHHqHHHHHH', 'HHHHHHHHHH']);
  const LAMP_DOME = S((() => { const g = Grid(13, 30); g.rect(6, 0, 1, 21, 'g'); shCylV(g, 5, 20, 7, 22, 'metal');   // Emaille-Glocke mit Rand und Glühbirne
    for (let y = 23; y < 29; y++) { const t = (y - 23) / 5, w = Math.round(2 + t * 4.5); for (let x = 6 - w; x <= 6 + w; x++) g.set(x, y, tone('teal', .7 - (x - 6 + w) / (2 * w) * 1.1 - t * .2, x, y)); }
    g.rect(0, 28, 13, 1, 'O'); g.rect(1, 27, 2, 1, 'B'); g.rect(4, 29, 5, 1, 'W'); g.set(6, 29, 'G'); return g.rows(); })());
  const LAMP_WALL = S((() => { const g = Grid(10, 8); g.rect(1, 0, 8, 1, 'g'); g.set(1, 1, 'g'); g.set(8, 1, 'g'); shCylV(g, 4, 1, 5, 2, 'metal');
    for (let y = 3; y < 7; y++) { const w = y - 1; for (let x = 5 - w; x < 5 + w; x++) g.set(x, y, tone('metal', .6 - (x - 5 + w) / (2 * w) * .9, x, y)); } g.rect(1, 7, 8, 1, 'W'); return g.rows(); })());
  const LAMP_PF = S((() => { const g = Grid(7, 7); g.rect(3, 0, 1, 4, 'g'); for (let y = 4; y < 6; y++) for (let x = 0; x < 7; x++) if (y === 5 || (x > 0 && x < 6)) g.set(x, y, tone(['b', 'c', 'd', 'e', 'f'], .6 - x * .12, x, y)); g.rect(1, 6, 5, 1, 'W'); return g.rows(); })());

  // ---------- Blechwerkstatt: Brückenkran (gelb, deutlich anders als die Lampen) ----------
  const RUNWAY = S(['F'.repeat(384), 'E'.repeat(384), 'DEEaEEDEEaEEDEEaEE'.repeat(22).slice(0, 384), 'E'.repeat(384), 'C'.repeat(384), 'a'.repeat(384)]);
  const BRIDGE = S(['E'.repeat(40), 'F' + 'aE'.repeat(19) + 'F', 'D'.repeat(40)]);
  const HOIST = S(['.hh..........hh.', 'gggggggggggggggg', 'gTTTTTTTTTTTTTTg', 'gTEEaaEEaaEEaaTg', 'gTEaaEEaaEEaaETg', 'gTTTTTTTTTTTTTTg', 'gggggggggggggggg', '....h......h....']);
  const BLOCK = S(['.EaE.', 'EaEaE', '.hhh.', '..h..', '.h.h.', '.hh..']);
  const BUNDLE = S(['Z'.repeat(26), 'Y'.repeat(26), 'Z'.repeat(26), 'X'.repeat(26)]);
  const LAMP_LONG = S((() => { const g = Grid(7, 19); g.rect(3, 0, 1, 16, 'g'); for (let y = 16; y < 18; y++) for (let x = 0; x < 7; x++) if (y === 17 || (x > 0 && x < 6)) g.set(x, y, tone('metal', .65 - x * .14, x, y)); g.rect(1, 18, 5, 1, 'W'); return g.rows(); })());

  // ---------- Ausbaustufen: sichtbare Erweiterungen ----------
  const PALLET = S(['dededededededede', 'cccccccccccccccc', 'c..c....c.....cc']);
  const BENTPART = S(['Z......Z', 'YZZZZZZY']);
  const GBOX = S((() => { const g = Grid(36, 15); g.rect(0, 0, 36, 1, 'j'); g.rect(0, 1, 36, 1, 'h'); g.rect(0, 7, 36, 1, 'h'); g.rect(0, 12, 36, 2, 'g'); for (let x = 0; x < 36; x += 4) g.rect(x, 1, 1, 11, x % 8 ? 'i' : 'h'); g.rect(35, 1, 1, 11, 'h'); g.rect(2, 14, 4, 1, 'c'); g.rect(30, 14, 4, 1, 'c'); g.rect(14, 3, 8, 3, 'E'); g.rect(15, 4, 6, 1, 'C'); return g.rows(); })());
  const BACKGAUGE = S(['hhhhhhhhhhhhhhhhhhhhhhh', 'g...g...g...g...g...g.g', 'gEEg']);
  const CNC = S(['gggggggggggg', 'gUUUUUUUUUUg', 'gUzUUUAUUUUg', 'gUUUUqUUUzUg', 'gUUUUUUUUUUg', 'gggggggggggg', '.....gg.....', '.....gg.....', 'gggggggggggg']);
  const CURTAIN = S(['EE', 'aE', 'EE', 'aE', 'EE', 'aE', 'EE', 'aE', 'EE', 'aE', 'EE', 'aE', 'EE', 'aE', 'EE', 'aE', 'EE', 'aE', 'EE', 'aE', 'EE', 'gg', 'gg']);
  const TOOLCH = S((() => { const g = Grid(18, 18); for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) { const d = x * x + y * y; if (d <= 64) g.set(9 + x, 9 + y, d > 49 ? 'g' : d < 9 ? 'j' : 'Y'); } for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.set(9 + Math.round(Math.cos(a) * 5), 9 + Math.round(Math.sin(a) * 5), 'E'); } return g.rows(); })());
  const ENCL = S((() => { const g = Grid(58, 40); g.rect(0, 0, 58, 2, 'P'); g.rect(0, 0, 2, 40, 'P'); g.rect(56, 0, 2, 40, 'P'); g.rect(28, 0, 2, 40, 'O'); g.rect(0, 38, 58, 2, 'O'); g.rect(4, 32, 6, 3, 'E'); return g.rows(); })());
  const CONVEY = S((() => { const g = Grid(30, 26); for (let i = 0; i < 26; i++) { g.set(2 + i, 24 - Math.floor(i * .8), 'h'); g.set(2 + i, 23 - Math.floor(i * .8), 'X'); } for (let i = 0; i < 26; i += 4) g.set(2 + i, 22 - Math.floor(i * .8), 'Y'); fill(g, 22, 16, 8, 10, 'blue', 2); g.rect(23, 17, 6, 2, 'Y'); g.set(2, 25, 'g'); g.set(27, 25, 'g'); return g.rows(); })());
  const BARFEED = S((() => { const g = Grid(46, 14); fill(g, 0, 2, 46, 6, 'gold', 2); g.rect(0, 4, 46, 1, 'C'); for (const x of [4, 38]) fill(g, x, 8, 4, 6, 'metal', 1); g.rect(42, 0, 4, 2, 'E'); return g.rows(); })());
  const TOWERL = S(['.g.', 'gug', 'gEg', 'gqg', '.g.', '.g.', '.g.', 'ggg']);
  const TAP2B = S((() => { const g = Grid(34, 26);
    part(g, 18, 2, 16, 4, 'metal', 2); g.rect(19, 3, 14, 1, 'Z');                                     // Ausleger an die Säule
    part(g, 2, 0, 18, 10, 'blue', 2); screenAt(g, 5, 3, 5, 3); knob(g, 14, 3, 'E'); g.rect(8, 10, 5, 2, 'X');   // zweiter Kopf
    part(g, 0, 17, 22, 9, 'metal', 1); g.rect(6, 15, 2, 2, 'Y'); g.rect(14, 15, 2, 2, 'Y'); bolt(g, 2, 21); bolt(g, 19, 21);   // zweiter Schraubstock
    return g.rows(); })());
  const TAP2 = S((() => { const g = Grid(22, 30); part(g, 8, 0, 5, 26, 'metal', 2); g.rect(9, 1, 1, 24, 'Z'); part(g, 0, 2, 20, 8, 'blue', 2); screenAt(g, 3, 4, 5, 3); knob(g, 15, 4, 'E'); part(g, 2, 24, 18, 6, 'metal', 1); bolt(g, 4, 26); bolt(g, 16, 26); g.rect(20, 5, 2, 1, 'h'); return g.rows(); })());
  const FEEDER = S(['hhhhhhhhhhhhhhhhhhhhhhhhhhhh', 'gXgXgXgXgXgXgXgXgXgXgXgXgXgX', '.g......................g...', '.g......................g...', '.g......................g...', 'ggg....................ggg..']);
  const TANK = S((() => { const g = Grid(30, 24); shCylH(g, 0, 4, 29, 19, 'teal', 1); g.rect(2, 8, 26, 1, 'O'); g.rect(2, 15, 26, 1, 'O'); shCylV(g, 24, 0, 27, 4, 'metal'); shBall(g, 25.5, 0.5, 2.5, 1.2, 'red');
    for (const x of [4, 22]) shBox(g, x, 20, x + 3, 23, 'dark'); shBox(g, 10, 10, 17, 12, 'gold', .5); g.rect(11, 11, 6, 1, 'C'); return g.rows(); })());
  const GEN2 = S((() => { const g = Grid(40, 30); shBox(g, 0, 6, 33, 25, 'teal'); for (let y = 9; y < 23; y += 3) for (let x = 3; x < 15; x++) { g.set(x, y, 'O'); g.set(x, y + 1, tone('teal', .5 - (x - 3) * .02, x, y + 1)); }
    shBox(g, 18, 9, 30, 16, 'dark'); for (let y = 10; y < 15; y++) for (let x = 19; x < 30; x++) g.set(x, y, (y === 12 && x < 26) ? 'z' : 'U'); shCylV(g, 6, 0, 8, 6, 'metal');
    shBox(g, 34, 10, 39, 25, 'metal'); for (let y = 12; y < 24; y += 2) g.rect(35, y, 4, 1, 'T'); shBox(g, 0, 26, 39, 29, 'steel'); hazard(g, 2, 27, 36, 1); return g.rows(); })());
  // Teilelager: Holzregal -> hohes Holzregal -> Stahl-Hochregal mit Hebebühne
  function rackGrid(level, broken) {
    if (level <= 1 || broken) return shelfGrid(level, broken);
    const metal = level >= 2, big = level >= 3, h = big ? 104 : 86, w = big ? 64 : 54, g = Grid(w, h), boards = big ? 6 : 5, gap = Math.floor((h - 6) / boards);
    const post = (x) => { if (metal) { g.rect(x, 0, 3, h, 'y'); g.rect(x, 0, 1, h, 'z'); for (let y = 3; y < h; y += 6) g.set(x + 1, y, 'x'); } else fill(g, x, 0, 3, h, 'wood', 3); };
    post(0); post(w - 3); post(Math.floor(w / 2) - 1);
    if (!metal) for (let y = 4; y < h - 4; y += 10) for (let i = 0; i < w / 2 - 3; i++) { g.set(3 + i, y + Math.floor(i * 9 / (w / 2)), 'c'); }
    const r = ART.rng(level * 7);
    for (let k = 0; k < boards; k++) {
      const y = 6 + k * gap;
      if (metal) { g.rect(0, y, w, 2, 'V'); g.rect(0, y, w, 1, 'E'); } else fill(g, 0, y, w, 2, 'wood', 3);
      if (k === 0) continue;
      for (let j = 0; j < 4; j++) {
        const x = 4 + j * Math.floor((w - 6) / 4), bw = Math.floor((w - 6) / 4) - 3, kind = Math.floor(r() * 3), bh = Math.min(gap - 3, 9);
        shelfItem(g, x, y - bh, bw, bh, kind);
      }
    }
    return g;
  }
  const RACK = [0, 1, 2, 3].map(l => G2S(rackGrid(l)));
  const LIFT_DECK = S(['V'.repeat(22), 'E'.repeat(22), 'gEEEEEEEEEEEEEEEEEEEEg'.slice(0, 22)]);
  const LIFT_RAIL = S(['g.......g', 'gg.....gg', '.g.....g.']);

  // ---------- Kaufbare Einrichtung (drinnen): an die Wand oder auf den Boden ----------
  const DSI = {
    plakat: S(['EEEEEEEEEEEE', 'EaaaaaaaaaaE', 'EaEEEEEEEEaE', 'EaEEEaaEEEaE', 'EaEEaEEaEEaE', 'EaEEaEEaEEaE', 'EaEEEaaEEEaE', 'EaEEEEEEEEaE', 'EaaaaaaaaaaE', 'EEEEEEEEEEEE', 'EaEaaEaEaaEE', 'EEEEEEEEEEEE', 'EaaEaEaaEaEE', 'EEEEEEEEEEEE']),
    zeichnung: S((() => { const g = Grid(26, 18); fill(g, 0, 0, 26, 18, 'wood', 2); g.rect(2, 2, 22, 14, 'J');
      g.rect(4, 4, 7, 5, 'y'); g.rect(5, 5, 5, 3, 'J'); g.rect(13, 4, 5, 5, 'y'); g.rect(14, 5, 3, 3, 'J'); g.rect(4, 10, 7, 4, 'y'); g.rect(5, 11, 5, 2, 'J');   // drei Ansichten
      g.rect(12, 6, 1, 1, 'z'); g.rect(4, 9, 1, 1, 'z'); g.rect(19, 12, 4, 3, 'i'); g.rect(20, 13, 2, 1, 'J'); return g.rows(); })()),
    ordner: S((() => { const g = Grid(28, 15);   /* Wandregal: Ordner mit runden Rücken (hell links, dunkel rechts), Rückenschild, Griffloch; ein Ordner lehnt schräg, daneben eine Ablagebox */
      const cols = [['s', 't', 'u', 'v'], ['x', 'y', 'z', 'A'], ['n', 'o', 'p', 'q'], ['C', 'D', 'E', 'F'], ['O', 'P', 'Q', 'B'], ['s', 't', 'u', 'v'], ['x', 'y', 'z', 'A']];
      cols.forEach((c, i) => { const x = 1 + i * 3, top = 2 + (i % 3 === 1 ? 1 : 0); if (i === 6) return;
        for (let y = top; y < 12; y++) { g.set(x, y, c[3]); g.set(x + 1, y, c[2]); g.set(x + 2, y, c[0]); } g.set(x + 1, top, c[3]); g.set(x + 2, top, c[1]);
        g.rect(x + 1, top + 2, 1, 3, 'J'); g.set(x + 1, top + 3, i % 2 ? 'h' : 'i'); g.set(x + 1, 9, 'a'); g.set(x + 1, 10, c[1]); });
      for (let j = 0; j < 9; j++) { const xx = 19 + Math.floor(j / 3); g.set(xx, 11 - j, 'y'); g.set(xx + 1, 11 - j, 'z'); g.set(xx + 2, 11 - j, 'x'); } g.set(20, 4, 'J');   /* schräg lehnender Ordner */
      fill(g, 23, 6, 4, 6, 'wood', 3); g.rect(24, 8, 2, 1, 'b'); g.rect(23, 5, 4, 1, 'J'); g.set(24, 4, 'H');   /* Ablagebox mit Papier */
      g.rect(0, 12, 28, 1, 'e'); g.rect(0, 13, 28, 1, 'c'); g.rect(1, 14, 26, 1, 'b');   /* Regalbrett mit Kante und Schatten */
      g.set(3, 14, 'h'); g.set(24, 14, 'h'); return g.rows(); })()),
    werkzeugwand: S((() => { const g = Grid(30, 20);   /* Lochwand mit Rahmen; Werkzeuge mit Licht von links oben und Schattenkontur auf der Wand */
      fill(g, 0, 0, 30, 20, 'wood', 4); for (let y = 2; y < 19; y += 3) for (let x = 2; x < 29; x += 3) g.set(x, y, 'c');
      g.rect(0, 0, 30, 1, 'f'); g.rect(0, 19, 30, 1, 'b'); g.rect(29, 0, 1, 20, 'c'); g.rect(0, 0, 1, 20, 'e');
      const sh = (x, y, w, h) => g.rect(x + 1, y + 1, w, h, 'c');   /* Schatten auf der Lochwand */
      sh(3, 3, 2, 11); sh(2, 2, 4, 2); g.rect(3, 4, 2, 10, 'd'); g.rect(3, 4, 1, 10, 'e'); g.set(4, 13, 'c'); g.rect(2, 2, 4, 2, 'X'); g.rect(2, 2, 4, 1, 'Z'); g.set(5, 3, 'T');   /* Hammer: Holzstiel, Stahlkopf */
      sh(8, 3, 3, 12); g.rect(9, 5, 1, 10, 'Y'); g.rect(8, 3, 3, 2, 'Y'); g.set(8, 3, 'l'); g.set(9, 3, '.'); g.set(10, 4, 'X'); g.set(9, 14, 'X'); g.rect(9, 5, 1, 1, 'Z');   /* Maulschlüssel */
      sh(13, 4, 8, 5); g.rect(13, 4, 8, 4, 't'); g.rect(13, 4, 8, 1, 'v'); g.rect(13, 7, 8, 1, 's'); g.rect(14, 5, 2, 1, 'u'); g.rect(13, 8, 8, 1, 'Y'); g.rect(13, 8, 8, 1, 'Z'); g.set(20, 8, 'X');   /* Säge: roter Griff, Sägeblatt */
      for (let x = 14; x < 21; x += 2) g.set(x, 9, 'X');
      for (const [x, c] of [[23, ['C', 'E', 'F']], [26, ['x', 'z', 'A']]]) { sh(x, 3, 2, 11); g.rect(x, 3, 2, 5, c[1]); g.rect(x, 3, 1, 5, c[2]); g.set(x + 1, 7, c[0]); g.rect(x, 8, 1, 6, 'Y'); g.set(x, 8, 'Z'); g.set(x, 13, 'X'); }   /* zwei Schraubendreher */
      sh(13, 12, 9, 5); g.rect(13, 12, 9, 5, 'O'); g.rect(13, 12, 9, 1, 'Q'); g.rect(13, 12, 1, 5, 'Q'); g.rect(21, 13, 1, 4, 'O'); g.rect(14, 13, 7, 3, 'P'); g.rect(15, 14, 5, 1, 'O'); g.rect(16, 13, 3, 1, 'Z');   /* Werkzeugkasten mit Griff */
      return g.rows(); })()),
    urkunde: S(['DDDDDDDDDDDDDDDD', 'DEEEEEEEEEEEEEED', 'DEJJJJJJJJJJJJED', 'DEJiiiiiiiiiiJED', 'DEJJJJJJJJJJJJED', 'DEJiiiiiiiJJJJED', 'DEJJJJJJJJJJJJED', 'DEJiiiiiJJJuuJED', 'DEJJJJJJJJJutJED', 'DEJJJJJJJJJJJJED', 'DEEEEEEEEEEEEEED', 'DDDDDDDDDDDDDDDD']),
    banner: S(['hhhhhhhhhhhhhhhh', '.PPPPPPPPPPPPPP.', '.PQQQQQQQQQQQQP.', '.PQPPPPEEPPPPQP.', '.PQPPPEFFEPPPQP.', '.PQPPEFPPFEPPQP.', '.PQPPEFPPFEPPQP.', '.PQPPPEFFEPPPQP.', '.PQPPPPEEPPPPQP.', '.PQQQQQQQQQQQQP.', '.PPPPPPPPPPPPPP.', '.PPPPPP..PPPPPP.', '.PPPPP....PPPPP.', '.PPPP......PPPP.']),
    leuchtschild: S((() => { const g = Grid(34, 14); fill(g, 0, 0, 34, 14, 'metal', 0); g.rect(1, 1, 32, 12, 'U'); g.rect(1, 1, 32, 12, 'a');
      const W2 = 'W'; for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = x * x + y * y; if (d >= 9 && d <= 17) g.set(8 + x, 7 + y, W2); }   // Zahnrad aus Neon
      [[17, 3], [16, 4], [15, 5], [16, 6], [17, 7], [16, 8], [15, 9], [15, 10]].forEach(([x, y]) => g.set(x + 3, y, 'V'));   // Blitz
      for (let i = 0; i < 8; i++) { g.set(23 + i, 4, 'W'); g.set(23 + i, 10, 'W'); } g.rect(23, 4, 1, 7, 'W'); g.rect(30, 4, 1, 7, 'W'); return g.rows(); })()),
    pflanze: S((() => { const g = Grid(20, 44);   // große Zimmerpflanze (Ficus): hoher Stamm, mehrere Blattbüschel, Terrakotta-Topf
      g.rect(9, 10, 2, 24, 'c'); g.rect(9, 10, 1, 24, 'd'); g.rect(6, 18, 3, 1, 'c'); g.rect(11, 14, 3, 1, 'c');
      for (const [x, y, r] of [[10, 5, 5], [5, 12, 4], [15, 10, 4], [6, 20, 4], [14, 18, 4], [10, 13, 4], [9, 25, 3], [13, 26, 3]]) shBall(g, x, y, r, r * .85, ['m', 'n', 'o', 'p', 'q', 'r']);
      shCylV(g, 4, 33, 15, 43, 'red'); g.rect(3, 33, 14, 2, 'u'); g.rect(3, 33, 14, 1, 'v'); return g.rows(); })()),
    gitterbox: S((() => { const g = Grid(24, 18);   /* Gitterbox: Rückwand-Gitter dunkel, Werkstücke im Inneren, Vordergitter darüber, Eckpfosten und Kufen */
      for (let y = 1; y < 15; y++) for (let x = 1; x < 23; x++) if (x % 4 === 2 || y % 4 === 2) g.set(x, y, 'T');   /* hinteres Gitter, versetzt und dunkel */
      const parts = [[2, 6, 'Z'], [6, 5, 'Y'], [10, 6, 'Z'], [14, 5, 'Y'], [18, 6, 'Z'], [4, 9, 'Y'], [9, 8, 'Z'], [14, 9, 'Y'], [18, 9, 'Z']];
      for (const [x, y, c] of parts) { g.rect(x, y, 4, 2, c); g.rect(x, y, 4, 1, 'l'); g.rect(x + 3, y, 1, 3, 'X'); g.set(x, y + 1, c === 'Z' ? 'Y' : 'X'); }   /* gekantete Bleche, gestapelt */
      g.rect(1, 11, 22, 4, 'X'); for (let x = 1; x < 23; x += 2) g.set(x, 11, 'Y');   /* gefüllter Boden: dichter Stapel */
      for (let y = 0; y < 15; y++) for (let x = 0; x < 24; x++) { const post = x === 0 || x === 23, rim = y === 0 || y === 14; if (post || rim) g.set(x, y, post ? (x === 0 ? 'Z' : 'T') : y === 0 ? 'Z' : 'X'); else if (x % 4 === 0 || y % 4 === 0) g.set(x, y, y % 4 === 0 && x % 4 === 0 ? 'Z' : 'Y'); }   /* vorderes Gitter über den Teilen */
      g.rect(1, 0, 22, 1, 'l'); g.rect(10, 1, 4, 2, 'E'); g.rect(10, 1, 4, 1, 'F'); g.rect(11, 2, 2, 1, 'a');   /* Kennzeichnungsschild */
      fill(g, 0, 15, 24, 2, 'wood', 2); g.rect(1, 17, 3, 1, 'b'); g.rect(10, 17, 4, 1, 'b'); g.rect(20, 17, 3, 1, 'b');   /* Kufen */
      return g.rows(); })()),
    werkzeugwagen: S(['uuuuuuuuuuuuuu', 'uvvvvvvvvvvvvu', 'uuuuuuuuuuuuuu', 'utttttttttttttu'.slice(0, 14), 'uvvvvvJJvvvvvu', 'uuuuuuuuuuuuuu', 'uvvvvvJJvvvvvu', 'uuuuuuuuuuuuuu', 'uvvvvvJJvvvvvu', 'uuuuuuuuuuuuuu', '.g..........g.', 'ghg........ghg']),
    werkbank: S((() => { const g = Grid(34, 20); fill(g, 0, 6, 34, 3, 'wood', 4); for (const x of [2, 29]) fill(g, x, 9, 3, 11, 'wood', 2); g.rect(5, 14, 24, 2, 'c'); fill(g, 6, 1, 7, 5, 'metal', 2); g.rect(7, 0, 5, 1, 'X'); g.rect(13, 3, 3, 1, 'h'); g.rect(22, 4, 7, 2, 'u'); g.rect(22, 3, 3, 1, 'Y'); return g.rows(); })()),
    kaffee: S((() => { const g = Grid(26, 22); fill(g, 0, 10, 26, 3, 'wood', 4); for (const x of [2, 22]) fill(g, x, 13, 2, 9, 'wood', 2); fill(g, 3, 0, 9, 10, 'metal', 1); g.rect(4, 2, 7, 2, 'g'); g.rect(5, 2, 3, 1, 'U'); g.rect(6, 6, 3, 3, 'h'); g.rect(7, 8, 1, 1, 'b');
      g.rect(15, 7, 3, 3, 'J'); g.set(18, 8, 'J'); g.rect(20, 6, 3, 4, 'u'); g.set(23, 7, 'u'); g.rect(15, 6, 3, 1, 'b'); return g.rows(); })())
  };
  // Wandplätze je Raum (Mitte x, Unterkante y) und Bodenplätze (slots)
  const WALL = { pfoertner: { y: 104, xs: [60, 134, 352], ys: [136, 126, 124] }, blechwerkstatt: { y: 90, xs: [73, 149, 225] }, maschinenhalle: { y: 116, xs: [56, 250, 298] }, prueflabor: { y: 114, xs: [150, 245, 340] }, kraftwerk: { y: 126, xs: [20, 120, 214], ys: [126, 121, 126] } };   /* mit Abstand zu Lüfter, Tor und Nachbarn */   // ys: eigene Höhe je Platz

  // ---------- Räume ----------
  // Plätze für gekaufte Gegenstände: slots; Wege der Arbeiter: walk
  const ROOMS = {
    pfoertner: { wall: 'pfoertner', floor: 'wood', lamps: [{ x: 64, pf: 1 }, { x: 292, pf: 1 }], slots: [36, 122, 206], stations: { notstrom: { x: 334, w: 70, h: 40 } },
      walk: [{ x: 142, act: 'work', face: 1 }, { x: 229, act: 'look', face: 1, depth: 9 }, { x: 140, act: 'idle', face: -1 }, { x: 300, act: 'work', face: 1 }, { x: 64, act: 'look', face: 1, depth: 7 }] },
    blechwerkstatt: { wall: 'blechwerkstatt', floor: 'conc', lamps: [{ x: 73, wall: 1 }, { x: 149, wall: 1 }, { x: 225, wall: 1 }, { x: 301, wall: 1 }], slots: [30, 128, 268], stations: { abkant: { x: 180, w: 84, h: 60 }, lager: { x: 330, w: 64, h: 104 } },
      walk: [{ x: 222, act: 'work', face: 1 }, { x: 160, act: 'work', face: 1 }, { x: 90, act: 'work', face: 1 }, { x: 52, act: 'hammer', face: -1 }] },
    maschinenhalle: { wall: 'maschinenhalle', floor: 'conc', lamps: [{ x: 54, tube: 1 }, { x: 150, tube: 1 }, { x: 246, tube: 1 }, { x: 342, tube: 1 }], slots: [24, 166, 372], stations: { fraese: { x: 100, w: 56, h: 70 }, dreh: { x: 262, w: 100, h: 46 } },
      walk: [{ x: 84, act: 'work', face: 1 }, { x: 236, act: 'work', face: 1 }, { x: 128, act: 'pick', face: 1 }, { x: 190, act: 'drop', face: 1 }, { x: 330, act: 'idle', face: -1 }] },
    prueflabor: { wall: 'prueflabor', floor: 'tile', lamps: [{ x: 60, lab: 1 }, { x: 156, lab: 1 }, { x: 252, lab: 1 }, { x: 348, lab: 1 }], slots: [24, 192, 364], stations: { gewinde: { x: 84, w: 64, h: 52 }, montage: { x: 304, w: 90, h: 50 } },
      walk: [{ x: 104, act: 'hammer', face: 1 }, { x: 196, act: 'work', face: 1 }, { x: 250, act: 'work', face: 1 }, { x: 140, act: 'pick', face: 1 }, { x: 330, act: 'drop', face: 1 }] },
    kraftwerk: { wall: 'kraftwerk', floor: 'conc', lamps: [{ x: 48, dome: 1 }, { x: 144, dome: 1 }, { x: 240, dome: 1 }], slots: [26, 196, 364], stations: {},
      walk: [{ x: 112, act: 'work', face: 1 }, { x: 224, act: 'work', face: 1 }, { x: 296, act: 'idle', face: 1 }, { x: 60, act: 'idle', face: 1 }] }
  };
  const HIT = {};
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  // feine Linien in halben Pixeln (für Roboterarme): Querschnitt mit Licht oben links
  const H2 = (g, x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, .5, .5); };
  const segHD = (g, x0, y0, x1, y1, w, cols) => { const len = Math.hypot(x1 - x0, y1 - y0) || 1, n = Math.ceil(len * 2) + 1, nx = -(y1 - y0) / len, ny = (x1 - x0) / len, k2 = w * 2; for (let i = 0; i <= n; i++) { const px = x0 + (x1 - x0) * i / n, py = y0 + (y1 - y0) * i / n; for (let k = 0; k < k2; k++) { const o = (k - (k2 - 1) / 2) / 2; H2(g, px + nx * o, py + ny * o, cols[Math.min(cols.length - 1, Math.floor(k / k2 * cols.length))]); } } };
  const discHD = (g, cx, cy, r, f) => { for (let y = -r; y <= r; y += .5) for (let x = -r; x <= r; x += .5) { const d = Math.hypot(x, y) / r; if (d <= 1) H2(g, cx + x, cy + y, f(d, x, y)); } };
  const ARMC = ['#f8c682', '#eaa255', '#d27e38', '#b0602c', '#8a4624', '#62301c'], ARMG = ['#bcc4d2', '#97a2b6', '#76829a', '#5b667c', '#465065', '#343c50'];
  const seg = (g, x0, y0, x1, y1, c, w) => { const nn = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= nn; i++) R(g, x0 + (x1 - x0) * i / nn - w / 2, y0 + (y1 - y0) * i / nn - w / 2, w, w, c); };
  // Roboterarm: Basis bx/by, Winkel a1/a2
  function robotArm(g, bx, by, a1, a2, col, small) {
    const l1 = small ? 14 : 18, l2 = small ? 12 : 16;
    const ex = bx + Math.cos(a1) * l1, ey = by + Math.sin(a1) * l1, fx = ex + Math.cos(a1 + a2) * l2, fy = ey + Math.sin(a1 + a2) * l2;
    seg(g, bx, by, ex, ey, col, 3); seg(g, ex, ey, fx, fy, col, 2); R(g, ex - 1, ey - 1, 3, 3, '#3e2731'); R(g, fx - 1, fy, 3, 2, '#6b6672');
  }
  // Pressenhub: langsam absenken, kurzer schwerer Schlag, Pause, langsam heben
  // Abkantbank: b = Unterkante des Stempels relativ zur Presse, depth = wie tief das Blech in die Nut gedrückt ist, angle = Biegewinkel, slide = Teilewechsel
  function pressCycle(time) {
    // 0–.16 Blech vom Stapel links einlegen · .16–.78 Kanten · .78–1 fertiges Teil in die Gitterbox rechts
    const p = (time / 3.6) % 1, TOP = 22, CONTACT = 32, BOTTOM = 35, A = .62;
    if (p < .16) return { b: TOP, depth: 0, angle: 0, mv: 'in', q: ease(p / .16) };
    if (p < .44) return { b: TOP + (CONTACT - TOP) * ease((p - .16) / .28), depth: 0, angle: 0 };
    if (p < .58) { const q = ease((p - .44) / .14); return { b: CONTACT + (BOTTOM - CONTACT) * q, depth: Math.round(3 * q), angle: A * q }; }
    if (p < .64) return { b: BOTTOM, depth: 3, angle: A };
    if (p < .78) { const q = ease((p - .64) / .14); return { b: BOTTOM - (BOTTOM - TOP) * q, depth: Math.max(0, Math.round(3 - q * 6)), angle: A }; }
    return { b: TOP, depth: 0, angle: A, mv: 'out', q: Math.min(1, (p - .78) / .2) };
  }
  // Träger: holt nach drei fertigen Teilen den Stapel ab und bringt ihn weg (alles reine Funktionen der Zeit)
  function porter(time, o) {
    const N = o.n || 3, SP = N * o.P, t = ((time % SP) + SP) % SP, pick = (N - 1) * o.P + o.land + .5, v = o.speed || 11;
    let stack = 0; for (let i = 0; i < N; i++) if (t >= i * o.P + o.land) stack++;
    if (t >= pick) stack = 0;
    const d1 = Math.abs(o.src - o.rest) / v, d2 = Math.abs(o.dst - o.src) / v, d3 = Math.abs(o.rest - o.dst) / v, leave = pick - .5 - d1;
    let u = t - leave; if (u < 0) u += SP;
    const sg = x => x >= 0 ? 1 : -1, L = (a, b, q) => a + (b - a) * q;
    let w;
    if (u < d1) w = { x: L(o.rest, o.src, u / d1), pose: 'walk', dir: sg(o.src - o.rest), dist: u * v };
    else if (u < d1 + 1) w = { x: o.src, pose: 'reach', dir: sg(o.src - o.rest) };
    else if (u < d1 + 1 + d2) { const q = (u - d1 - 1) / d2; w = { x: L(o.src, o.dst, q), pose: 'carry', dir: sg(o.dst - o.src), dist: q * d2 * v }; }
    else if (u < d1 + 1.7 + d2) w = { x: o.dst, pose: 'reach', dir: sg(o.dst - o.src) };
    else if (u < d1 + 1.7 + d2 + d3) { const q = (u - d1 - 1.7 - d2) / d3; w = { x: L(o.dst, o.rest, q), pose: 'walk', dir: sg(o.rest - o.dst), dist: q * d3 * v }; }
    else w = { x: o.rest, pose: o.restAct || 'idle', dir: o.restFace || 1 };
    return { stack, w };
  }
  function drawPorter(g, w, vi, time) { ART.OCC.on = true; try { drawPorter0(g, w, vi, time); } finally { ART.OCC.on = false; } }
  function drawPorter0(g, w, vi, time) {
    const W = WORKERS.set('big', vi); let s;
    if (w.pose === 'walk') s = W.walk[Math.floor(w.dist / 16 * 8) % 8];
    else if (w.pose === 'carry') s = W.carry[Math.floor(w.dist / 16 * 8) % 8];
    else if (w.pose === 'reach') s = W.reach[0];
    else if (w.pose === 'work') s = W.work[Math.floor(time * 1.6 + vi) % 4];
    else if (w.pose === 'phone') s = W.phone[Math.floor(time * .8 + vi) % 2];
    else if (w.pose === 'coffee') s = W.coffee[(time * .4 + vi * .3) % 1 < .25 ? 1 : 0];
    else if (w.pose === 'stretch' || w.pose === 'wave') s = W[w.pose][Math.floor(time * 2.2 + vi) % 2];
    else s = W.idle[Math.floor(time * .7 + vi) % 2];
    LATE.push(() => WORKERS.put(g, s, Math.round(w.x), BASE + 13, w.dir < 0));   // erst nach allen Maschinen zeichnen
  }
  const LATE = [];
  // Leseecke im Pförtnerhaus: Teppich, Ohrensessel, Stehlampe, Beistelltisch mit Radio, Zeitungsständer, große Pflanze
  const LOUNGE = S((() => { const g = Grid(70, 40);
    for (let y = 34; y < 40; y++) for (let x = 2 + (39 - y); x < 66 - (39 - y); x++) g.set(x, y, (x + y) % 8 < 1 ? 'K' : y === 34 || y === 39 ? 'K' : (x + y * 3) % 11 < 2 ? 'M' : 'L');   // Teppich
    shBox(g, 18, 14, 38, 26, 'red'); shBox(g, 16, 22, 40, 32, 'red'); shBox(g, 14, 18, 19, 32, 'red'); shBox(g, 36, 18, 41, 32, 'red');   // Ohrensessel
    g.rect(20, 23, 15, 1, 's'); shBox(g, 21, 16, 34, 21, ['s', 't', 'u', 'v', 'w']); for (const x of [17, 38]) g.rect(x, 33, 2, 3, 'b');
    shBox(g, 22, 25, 33, 27, ['H', 'J', 'J', 'J']);                                                                         // Kissen
    g.rect(5, 9, 1, 24, 'D'); g.rect(6, 9, 1, 24, 'C'); g.rect(4, 20, 3, 2, 'E'); g.set(4, 20, 'F');                          // Stehlampe: Messingstange mit Knauf
    for (let x = 2; x < 10; x++) g.set(x, 33, x < 4 ? 'E' : x > 7 ? 'C' : 'D'); for (let x = 3; x < 9; x++) g.set(x, 34, 'C'); g.rect(5, 32, 2, 1, 'E');   // runder Messingfuß
    for (let y = 0; y < 8; y++) { const w = 6 + Math.floor(y * .75), x0 = 6 - Math.floor(w / 2); for (let x = 0; x < w; x++) g.set(x0 + x, y, y === 0 ? 'e' : y === 7 ? 'd' : (x % 2 ? 'I' : x < w / 2 ? 'J' : 'H')); }   // Stoffschirm mit Falten, Messingränder
    for (let x = 2; x < 10; x++) g.set(x, 8, 'F');                                                                           // warmer Lichtsaum unter dem Schirm
    shBox(g, 46, 22, 56, 24, ['b', 'c', 'd', 'e', 'f']); for (const x of [47, 55]) g.rect(x, 25, 1, 9, 'b');             // Beistelltisch
    // (das Questbuch liegt auf dem Beistelltisch und wird im Raum gezeichnet)
    for (let i = 0; i < 3; i++) shBox(g, 58 + i * 3, 18 + i, 60 + i * 3, 33, ['H', 'I', 'J', 'J']); shBox(g, 57, 28, 67, 33, ['b', 'c', 'd']);   // Zeitungsständer
    return g.rows(); })());
  const BIGP = S((() => { const g = Grid(18, 34); for (const [x, y, r] of [[6, 8, 4], [12, 6, 4], [9, 4, 3], [4, 14, 4], [13, 13, 4], [9, 11, 4], [8, 18, 3]]) shBall(g, x, y, r, r, ['m', 'n', 'o', 'p', 'q', 'r']); g.rect(8, 20, 2, 6, 'b'); shCylV(g, 3, 25, 14, 33, 'red'); g.rect(3, 25, 12, 1, 'v'); return g.rows(); })());
  const SCREEN = S((() => { const g = Grid(24, 50);   // Paravent schräg nach hinten gestellt: vier Flügel im Zickzack, Holzrahmen, Reispapier
    const J = [0, 7, 11, 18, 22].map((x, k) => ({ x, y: 47 - Math.round(x * .45) - (k % 2 ? 3 : 0) }));
    for (let p = 0; p < 4; p++) { const a = J[p], b = J[p + 1], lit = p % 2 === 0;
      for (let x = a.x; x <= b.x; x++) { const y1 = Math.round(a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x)), y0 = y1 - 34;
        for (let y = y0; y <= y1; y++) { const edge = x === a.x || x === b.x || y === y0 || y === y1, bar = (y - y0) % 9 === 0; g.set(x, y, edge ? (lit ? 'c' : 'b') : bar ? (lit ? 'd' : 'c') : tone(['I', 'H', 'J', 'J'], (lit ? .62 : .12) - (y - y0) * .006, x, y)); } } }
    for (const j of J) g.rect(j.x, j.y + 1, 1, 2, 'b');
    return g.rows(); })());
  // ---------- Kleine Gimmicks: beim Antippen kurze Animation (GIM[name] = { t0, reward }) ----------
  const GIM = {};
  function gimT(name, time, dur) { const g = GIM[name]; if (!g) return null; if (g.t0 === undefined) g.t0 = time; const q = (time - g.t0) / dur; if (q >= 1) { delete GIM[name]; return null; } return q; }
  function wiggle(g, sp, x, b, q) {   // Sprite wackelt oben stärker als unten, klingt aus
    if (q === null) return blit(g, sp, x, b); const ox = Math.round(x) - Math.floor(sp.w / 2) - 1, oy = Math.round(b) - sp.h - 1, H2 = sp.c.height;
    for (let r = 0; r < H2; r++) { const off = Math.round(Math.sin(q * 11) * .9 * (1 - r / H2) * (1 - q));   /* sanftes Wiegen */ g.drawImage(sp.c, 0, r, sp.c.width, 1, ox + off, oy + r, sp.c.width, 1); } return { x: ox, y: oy, s: sp }; }
  function clockAt(g, x, b, key, time) {   // Kuckucksuhr: Vögelchen schaut oben heraus
    const o = blit(g, CLOCK, x, b); return o;   /* moderne Wanduhr: kein Kuckuck */
    const q = null; if (q === null) return o;
    const up = q < .15 ? q / .15 : q > .85 ? (1 - q) / .15 : 1, cx = o.x + Math.floor(CLOCK.c.width / 2), by = o.y - Math.round(up * 5), beak = (q > .2 && q < .4) || (q > .5 && q < .7);
    R(g, cx - 3, o.y - 1, 7, 1, '#5c3a2e'); R(g, cx - 2, by, 4, 3, '#a5703f'); R(g, cx - 2, by, 4, 1, '#cf9a5c'); R(g, cx - 1, by + 1, 1, 1, '#24182a'); R(g, cx - 3, by + 1 + (beak ? 1 : 0), 1, 1, '#e8a83a'); return o; }
  const CUCKOO = S((() => { const g = Grid(16, 18);   /* Kuckucksuhr aus Holz: Giebeldach, Türchen, Zifferblatt, Schnitzerei */
    for (let y = 0; y < 5; y++) for (let x = 7 - y - 1; x <= 8 + y; x++) g.set(x, y, y === 4 ? 'a' : (x + y) % 3 ? 'b' : 'c'); g.set(7, 0, 'e'); g.set(8, 0, 'e');
    shBox(g, 2, 5, 13, 15, 'wood'); g.rect(6, 6, 4, 3, 'a'); g.rect(7, 7, 2, 2, 'U');
    for (let y = 9; y < 15; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 11.5) < 3.2) g.set(x, y, Math.hypot(x - 7.5, y - 11.5) > 2.4 ? 'e' : 'J');
    g.set(7, 10, 'a'); g.set(7, 11, 'a'); g.set(8, 11, 'a'); g.set(9, 11, 'a'); g.rect(2, 15, 12, 1, 'a'); g.set(3, 6, 'q'); g.set(12, 6, 'q'); g.set(3, 13, 'q'); g.set(12, 13, 'q');
    return g.rows(); })());
  const CONE_W = S(['.c.', 'bdb', 'cdc', 'bdb', '.b.']);   /* Tannenzapfen-Gewicht */
  function cuckooAt(g, x, b, time) {   // Kuckucksuhr mit Pendel und Gewichten; beim Antippen ruft der Kuckuck
    const o = blit(g, CUCKOO, x, b); HIT.g_cuckoo = { x: o.x, y: o.y, w: CUCKOO.c.width, h: CUCKOO.c.height + 14, gim: 'cuckoo' };
    const cx = o.x + 1 + 8, by = o.y + 1 + 16, ph = Math.sin(time * 3.2), sw = Math.round(ph * 2); SFX.edge('cuckTick', ph > .95, 'tick', { pan: SFX.panX(cx), vol: .7 }); SFX.edge('cuckTock', ph < -.95, 'tock', { pan: SFX.panX(cx), vol: .7 });   /* leises Ticken im Takt des Pendels */   /* direkt unter der Unterkante des Gehäuses (Rasterzeile 15) */
    R(g, cx - 4, by, 1, 8, '#6b6672'); R(g, cx + 3, by, 1, 5, '#6b6672'); blit(g, CONE_W, cx - 4, by + 13); blit(g, CONE_W, cx + 3, by + 10);   // Ketten mit Gewichten
    for (let i = 0; i < 9; i++) R(g, cx - 1 + Math.round(sw * i / 9), by + i, 2, 1, '#a5703f'); R(g, cx - 2 + sw, by + 9, 4, 3, '#e8a83a');   // Pendel, genau mittig unter dem Gehäuse
    const q = gimT('cuckoo', time, 1.8); if (q !== null) { const up = q < .15 ? q / .15 : q > .85 ? (1 - q) / .15 : 1, beak = (q > .2 && q < .35) || (q > .5 && q < .65), bx = o.x + 1 + 8, byy = o.y + 1 + 7 - Math.round(up * 3);
      R(g, bx - 2, o.y + 1 + 6, 4, 3, '#1d1826'); R(g, bx - 2, byy - 1, 6, 5, '#24182a'); R(g, bx - 1, byy, 4, 3, '#fff3c0'); R(g, bx + 1, byy + 1, 2, 2, '#7fb6d6'); R(g, bx, byy, 1, 1, '#24182a'); R(g, bx - 3, byy + 1 + (beak ? 1 : 0), 2, 1, '#ff9a3c'); }   /* heller Kuckuck mit dunkler Kontur, oranger Schnabel */   // Kuckuck schaut aus dem Türchen
    return o; }
  function drawLounge(g, n, L, on, time) {
    const po = wiggle(g, BIGP, 10, BASE + 2, gimT('plantP', time, 1.2)); HIT.g_plantP = { x: po.x, y: po.y, w: BIGP.c.width, h: BIGP.c.height, gim: 'plantP' };
    const o = blit(g, LOUNGE, 56, BASE + 1); blit(g, SCREEN, 101, BASE + 3); HIT.g_lamp = { x: o.x, y: o.y, w: 12, h: 36, gim: 'lamp' }; const lampOff = gimT('lamp', time, 1.4) !== null;
    if (lampOff) { R(g, o.x + 2, o.y + 8, 8, 1, '#8a7a60'); R(g, o.x + 3, o.y + 2, 6, 5, 'rgba(40,30,40,.25)'); }   /* Lampe kurz aus */   // Leseecke weiter hinten, Paravent trennt sie vom Arbeitsbereich
    if (on && n > .15 && !lampOff) L.push({ x: o.x + 3, y: o.y + 8, w: 6, h: 2, c: '#ffd56a', cone: true, len: 40 });   // Stehlampe leuchtet abends
    {   // Questbuch auf dem Beistelltisch: rotes Buch mit Goldbeschlag und Lesezeichen; Klick öffnet das Questbuch
      const bx = o.x + 46, by = o.y + 16; R(g, bx, by + 2, 10, 4, '#3e2731'); R(g, bx + 1, by + 1, 9, 4, '#8c3040'); R(g, bx + 1, by + 1, 9, 1, '#b8474b'); R(g, bx + 2, by + 4, 8, 1, '#f4ecdc');
      R(g, bx + 5, by + 2, 2, 2, '#e8a83a'); R(g, bx + 5, by + 2, 1, 1, '#f7d86a'); R(g, bx + 8, by + 5, 1, 3, '#e8a83a');
      HIT.questbuch = { x: bx - 1, y: by - 1, w: 12, h: 9, quests: 1 }; }
  }
  // Abkantbank mit Kran (10 s): Kran hebt ein Blech vom Stapel auf die Auflage vor der Presse, Blech wird eingeschoben,
  // gekantet und fährt über die Rollenbahn nach rechts, bis es in die Gitterbox fällt
  const AK = { P: 10, stack: 104, rest: 126, land: 9.6 };
  function abkantCycle(time) {
    const t = time % AK.P, E = ease, L = (a, b, q) => a + (b - a) * q;
    const r = { kx: AK.stack, hook: 'up', sheet: null, b: 22, depth: 0, angle: 0, part: null };
    // Kran: holt das nächste Blech schon während des Biegens, senkt langsam ab und legt es dann behutsam auf die Auflage
    if (t < 1.2) { r.kx = L(AK.stack, AK.rest, E(t / 1.2)); r.lift = 1; r.sheet = 'crane'; }
    else if (t < 3.2) { r.kx = AK.rest; r.lift = 1; r.set = E((t - 1.2) / 2); r.sheet = 'crane'; }
    else if (t < 4.1) { r.kx = AK.rest; r.sheet = 'rest'; r.hookRel = 0; }
    else if (t < 5) { r.kx = AK.rest; r.hookRel = E((t - 4.1) / .9); r.sheet = t < 4.9 ? 'slide' : 'die'; r.slide = E(Math.min(1, (t - 4.1) / .8)); }
    else if (t < 6.3) { r.kx = L(AK.rest, AK.stack, E((t - 5) / 1.3)); r.hookRel = 1; r.sheet = 'die'; }
    else if (t < 8.3) { r.kx = AK.stack; r.hq = E((t - 6.3) / 2); r.hook = 'down'; r.sheet = 'die'; }
    else if (t < 8.7) { r.kx = AK.stack; r.hq = 1; r.hook = 'grab'; r.sheet = 'die'; r.lift = 0; r.held = 1; }
    else { r.kx = AK.stack; const q = E((t - 8.7) / 1.3); r.hq = 1 - q * .5; r.lift = q; r.held = 1; r.sheet = 'die'; }
    // Presse
    const TOP = 22, CONTACT = 32, BOTTOM = 35, A = .62;
    if (t >= 5 && t < 5.9) r.b = TOP + (CONTACT - TOP) * E((t - 5) / .9);
    else if (t >= 5.9 && t < 6.5) { const q = E((t - 5.9) / .6); r.b = CONTACT + (BOTTOM - CONTACT) * q; r.depth = Math.round(3 * q); r.angle = A * q; }
    else if (t >= 6.5 && t < 6.7) { r.b = BOTTOM; r.depth = 3; r.angle = A; }
    else if (t >= 6.7 && t < 7.5) { const q = E((t - 6.7) / .8); r.b = BOTTOM - (BOTTOM - TOP) * q; r.depth = Math.max(0, Math.round(3 - q * 6)); r.angle = A; }
    if (t >= 7.5) { r.angle = A; r.sheet = null; r.part = t < 9.2 ? { roll: (q => (q < .25 ? 2 * q * q : q - .125) / .875)((t - 7.5) / 1.7) } : t < 9.6 ? { drop: (t - 9.2) / .4 } : null; }
    return r;
  }
  // Blech mit Biegung um die Mitte (cx, y): zwei Schenkel, je 18 Pixel
  function drawBend(g, cx, y, a, flatNew) {
    const c = Math.cos(a), s = Math.sin(a);
    for (const dir of [-1, 1]) for (let i = 0; i <= 18; i++) { const x = Math.round(cx + dir * i * c), yy = Math.round(y - i * s); R(g, x, yy, 1, 1, '#d6f0f4'); R(g, x, yy + 1, 1, 1, '#7fb4c8'); }
    void flatNew;
  }
  // Fräse: down = Fräser abgesenkt (0..1), feed = Vorschub des Werkstücks (0..1)
  function millCycle(time) {
    const p = (time / 5.5) % 1;
    if (p < .1) return { down: ease(p / .1), feed: 0, cutting: false };
    if (p < .6) return { down: 1, feed: (p - .1) / .5, cutting: true };
    if (p < .68) return { down: 1 - ease((p - .6) / .08), feed: 1, cutting: false, done: true };
    if (p < .82) return { down: 0, feed: 1, cutting: false, done: true, out: (p - .68) / .14 };     // fertiges Teil in die Kiste links
    return { down: 0, feed: 0, cutting: false, inn: ease((p - .82) / .18) };                          // neues Rohteil von rechts
  }
  // Drehen: Schlitten fährt vom Reitstock zum Futter, hinter dem Drehmeißel ist die Welle dünner und blank
  function latheCycle(time) { const p = (time / 7) % 1; if (p < .7) return { x: 1 - p / .7, cutting: true }; if (p < .8) return { x: 0, cutting: false, drop: (p - .7) / .1 }; const q = ease((p - .8) / .2); return { x: q, cutting: false, feed: q }; }
  // Gewindeschneiden: Bohrer dreht rechts hinein, kurze Pause, dreht links heraus
  const TAP_P = 8;   // ein Gewindeteil alle 8 s, damit der Arbeiter in Ruhe abnehmen kann
  function tapCycle(time, off) { const p = ((time + (off || 0)) / TAP_P) % 1; if (p < .22) return { d: ease(p / .22), dir: 1 }; if (p < .27) return { d: 1, dir: 0 }; if (p < .48) return { d: 1 - ease((p - .27) / .21), dir: -1 }; return { d: 0, dir: 0, swap: (p - .48) / .52 }; }
  // Montage-Ablauf (15 s): Band bringt nacheinander Blechplatte, Drehwelle und Gewindemutter; der große Arm setzt sie
  // auf der Vorrichtung zusammen, der kleine Arm (ab Stufe 2) verschraubt; ein Arbeiter holt die Baugruppe mit dem Wagen ab
  const AS = { P1: 34, FIX: 84, UP: [52, 2], TIP: [25, 17, 15], PICK: [25, 26, 25], CART: 39 };
  function assyCycle(time) {
    const T = time % 15, lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
    const r = { conv: null, held: null, target: AS.UP, stage: 0, screw: -1, assy: 'fix', cartX: null, walk: 0, dir: -1, glint: 0 };
    if (T < 9) {
      const i = Math.floor(T / 3), u = T - i * 3, P = [AS.P1, AS.PICK[i]], F = [AS.FIX, AS.TIP[i]];
      r.stage = i;
      if (u < .9) { r.conv = { type: i, x: 6 + (AS.P1 - 6) * ease(u / .9) }; r.target = AS.UP; }
      else if (u < 1.35) { r.conv = { type: i, x: AS.P1 }; r.target = lerp(AS.UP, P, ease((u - .9) / .45)); }
      else if (u < 2.25) { r.held = i; const q = ease((u - 1.35) / .9); r.hq = q; r.target = q < .5 ? lerp(P, [58, 2], q * 2) : lerp([58, 2], F, (q - .5) * 2); }
      else if (u < 2.45) { r.target = F; r.stage = i + 1; }
      else { r.target = lerp(F, AS.UP, ease((u - 2.45) / .55)); r.stage = i + 1; }
    } else {
      r.stage = 3;
      if (T < 10.5) { r.screw = (T - 9) / 1.5; r.target = AS.UP; r.glint = T > 10.1 ? (T - 10.1) / .4 : 0; }
      else if (T < 10.9) r.target = lerp(AS.UP, [AS.FIX, AS.TIP[2]], ease((T - 10.5) / .4));
      else if (T < 11.7) { r.assy = 'arm'; r.target = lerp([AS.FIX, AS.TIP[2]], [AS.FIX, AS.CART], ease((T - 10.9) / .8)); }
      else if (T < 12) { r.assy = 'cart'; r.target = [AS.FIX, AS.CART]; }
      else { r.assy = 'cart'; r.target = lerp([AS.FIX, AS.CART], AS.UP, ease(Math.min(1, (T - 12) / .7))); }
    }
    // Wagen: kommt ab 6 s von rechts, wartet, fährt ab 12 s mit der Baugruppe hinaus
    if (T >= 6 && T < 9.5) { const q = ease((T - 6) / 3.5); r.cartX = 150 - (150 - AS.FIX) * q; r.walk = 1; r.dir = -1; }
    else if (T >= 9.5 && T < 12.2) { r.cartX = AS.FIX; r.walk = 0; }
    else if (T >= 12.2) { const q = (T - 12.2) / 2.8; r.cartX = AS.FIX + q * q * 0 + q * 150; r.walk = 1; r.dir = 1; }
    if (r.assy !== 'cart' && T >= 12.2) r.assy = 'cart';
    if (T < 9 && r.cartX === null) r.assy = 'fix';
    return r;
  }
  // Teile der Baugruppe: 0 Blechplatte, 1 Drehwelle, 2 Gewindemutter; top = Oberkante
  function assyPart(g, type, cx, top, lying) {
    if (type === 0) { R(g, cx - 6, top, 12, 3, '#a8c0cc'); R(g, cx - 6, top, 12, 1, '#d6f0f4'); R(g, cx + 5, top, 1, 3, '#6b6672'); R(g, cx - 4, top + 1, 1, 1, '#4a4652'); R(g, cx + 3, top + 1, 1, 1, '#4a4652'); }
    else if (type === 1) { if (lying) { R(g, cx - 4, top + 1, 9, 2, '#d8d2cc'); R(g, cx - 4, top + 1, 9, 1, '#fffaf0'); } else { R(g, cx - 1, top, 2, 8, '#d8d2cc'); R(g, cx - 1, top, 1, 8, '#fffaf0'); } }
    else { R(g, cx - 2, top, 5, 2, '#e8a83a'); R(g, cx - 2, top, 5, 1, '#f7d86a'); R(g, cx, top, 1, 2, '#7a4a1c'); }
  }
  function drawAssy(g, cx, bottom, stage, glint) {   // bottom = Unterkante der Platte
    if (stage > 0) assyPart(g, 0, cx, bottom - 3);
    if (stage > 1) assyPart(g, 1, cx, bottom - 11);
    if (stage > 2) assyPart(g, 2, cx, bottom - 13);
    void glint;
  }
  // Zweigelenkarm mit Inverskinematik, Ellbogen oben; gibt die Greiferposition zurück
  // Roboterarm mit Kontur, drei Farbtönen, Schlauch, Gelenkkappen mit Schraube und Greifer
  function band(g, x0, y0, x1, y1, w, cols) {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / len, ny = (x1 - x0) / len, n = Math.ceil(len * 1.6);
    for (let i = 0; i <= n; i++) { const px = x0 + (x1 - x0) * i / n, py = y0 + (y1 - y0) * i / n; for (let k = 0; k < w; k++) { const o = k - (w - 1) / 2; R(g, px + nx * o, py + ny * o, 1, 1, cols[Math.min(cols.length - 1, k)]); } }
  }
  function cap(g, x, y, r) { x = Math.round(x); y = Math.round(y); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const d = dx * dx + dy * dy; if (d > r * r + r * .6) continue; R(g, x + dx, y + dy, 1, 1, d > (r - 1) * (r - 1) + .5 ? '#3e2731' : (dx + dy < 0 ? '#d8d2cc' : '#8f8a92')); } R(g, x, y, 1, 1, '#4a4652'); R(g, x - 1, y - 1, 1, 1, '#fffaf0'); }
  function armDraw(g, S0, e, f, big, col) {
    const gray = col === '#8f8a92', A = gray ? ['#3e2731', '#b5afb0', '#8f8a92', '#6b6672', '#3e2731'] : ['#3e2731', '#f7d86a', '#e8a83a', '#c07a2a', '#7a4a1c', '#3e2731'];
    const w1 = big ? 6 : 5, w2 = big ? 5 : 4;
    band(g, S0[0], S0[1], e[0], e[1], w1, A); band(g, e[0], e[1], f[0], f[1], w2, A.slice(0, w2 - 1).concat(['#3e2731']));
    const len = Math.hypot(e[0] - S0[0], e[1] - S0[1]) || 1, nx = -(e[1] - S0[1]) / len * (w1 / 2 + .5), ny = (e[0] - S0[0]) / len * (w1 / 2 + .5);   // Schlauch neben dem Oberarm
    for (let i = 2; i < 9; i++) { const q = i / 10; R(g, S0[0] + (e[0] - S0[0]) * q - nx, S0[1] + (e[1] - S0[1]) * q - ny + Math.sin(q * Math.PI) * .8, 1, 1, '#24182a'); }
    R(g, S0[0] - 3, S0[1] - 1, 7, 4, '#3e2731'); R(g, S0[0] - 2, S0[1], 5, 2, gray ? '#8f8a92' : '#c07a2a'); R(g, S0[0] - 2, S0[1], 5, 1, gray ? '#b5afb0' : '#e8a83a');   // Motorgehäuse
    cap(g, S0[0], S0[1] - 1, big ? 3 : 2); cap(g, e[0], e[1], big ? 3 : 2); cap(g, f[0], f[1] - 1, 1);
    const fx = Math.round(f[0]), fy = Math.round(f[1]);
    R(g, fx - 3, fy, 7, 2, '#3e2731'); R(g, fx - 2, fy, 5, 1, '#b5afb0'); R(g, fx - 3, fy + 2, 2, 3, '#3e2731'); R(g, fx + 2, fy + 2, 2, 3, '#3e2731'); R(g, fx - 3, fy + 2, 1, 2, '#8f8a92'); R(g, fx + 2, fy + 2, 1, 2, '#8f8a92');
  }
  function robotIK(g, S0, T, l1, l2, col) {
    const dx = T[0] - S0[0], dy = T[1] - S0[1], d = Math.min(l1 + l2 - .5, Math.max(Math.abs(l1 - l2) + .5, Math.hypot(dx, dy))), th = Math.atan2(dy, dx);
    const al = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
    let best = null;
    for (const a1 of [th + al, th - al]) { const e = [S0[0] + Math.cos(a1) * l1, S0[1] + Math.sin(a1) * l1]; if (!best || e[1] < best.e[1]) best = { a1, e }; }
    const e = best.e, a12 = Math.atan2(S0[1] + Math.sin(th) * d - e[1], S0[0] + Math.cos(th) * d - e[0]), f = [e[0] + Math.cos(a12) * l2, e[1] + Math.sin(a12) * l2];
    armDraw(g, S0, e, f, l1 > 12, col);
    return [Math.round(f[0]), Math.round(f[1])];
  }
  function pressPhase(time) { const p = (time / 3.4) % 1; if (p < .5) return { d: ease(p / .5) * .85, hit: false, bent: false }; if (p < .56) return { d: .85 + (p - .5) / .06 * .15, hit: p > .53, bent: p > .54 }; if (p < .66) return { d: 1, hit: false, bent: true }; return { d: 1 - ease((p - .66) / .34), hit: false, bent: true }; }

  // st: { built, s: {id: {state, level, crate}}, placed, showSlots, sel, badges: [{id, ok}], orders: n, ordersDone: n }
  const CLK = {};

  // Maschinenhalle, Rückwand: Kranbahn mit Laufkatze, Druckluftleitung, Kabeltrasse mit Abgängen, Stückzahl-Tafel, Schaltschrank im Eck
  const FONT = { '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001011001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', 'A': '010101111101101', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111', 'F': '111100110100100', 'H': '101101111101101', 'K': '101110100110101', 'L': '100100100100111', 'N': '110101101101101', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010', 'U': '101101101101111', 'Z': '111001010100111' };
  function txt(g, str, x, y, c) {   // 3x5-Pixelschrift
    for (const ch of String(str)) { const f = FONT[ch]; if (f) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (f[j * 3 + i] === '1') R(g, x + i, y + j, 1, 1, c); x += 4; }
  }
  function hallWall(lc, f, d, dl, time, dt) {
    // Druckluftleitung (blau) und Kabeltrasse
    R(lc, 0, 77, W, 4, '#2f5d78'); R(lc, 0, 77, W, 1, '#7fb6d6'); R(lc, 0, 80, W, 1, '#24182a'); for (let x = 20; x < W; x += 48) { R(lc, x, 76, 3, 6, '#3b3f4a'); R(lc, x, 81, 1, 4, '#3b3f4a'); }
    R(lc, 0, 85, W, 4, '#6b6672'); R(lc, 0, 85, W, 1, '#b5afb0'); R(lc, 0, 88, W, 1, '#3e2731'); for (let x = 0; x < W; x += 3) R(lc, x, 86, 2, 1, ['#b8474b', '#24182a', '#e8a83a'][(x / 3) % 3]);
    // Abgänge zu den Maschinen: Druckluftschlauch zur Fräse, Kabel und Luft zur Drehmaschine
    const drop = (x, y0, y1, c, l) => { R(lc, x, y0, 2, y1 - y0, c); R(lc, x, y0, 1, y1 - y0, l); R(lc, x - 1, y0, 4, 2, '#3b3f4a'); };
    drop(118, 80, 110, '#2f5d78', '#7fb6d6'); R(lc, 116, 92, 6, 3, '#e8a83a'); R(lc, 116, 92, 6, 1, '#ffd56a');   // Wartungseinheit
    drop(226, 80, 142, '#2f5d78', '#7fb6d6'); drop(230, 88, 142, '#24182a', '#4a4652');   // enden hinter dem Spindelkasten
    // Stückzahl-Tafel: Teile im Ausgabelager je Maschine, Lampe grün = läuft, rot = steht
    { const x0 = 160, y0 = 92, w = 62, h = 28; R(lc, x0 + 14, y0 - 4, 1, 4, '#3b3f4a'); R(lc, x0 + w - 15, y0 - 4, 1, 4, '#3b3f4a');
      R(lc, x0 - 1, y0 - 1, w + 2, h + 2, '#3e2731'); R(lc, x0, y0, w, h, '#1d1a26'); R(lc, x0, y0, w, 1, '#4a4652'); R(lc, x0, y0 + 8, w, 1, '#3b3f4a');
      txt(lc, 'STUECKZAHL', x0 + 11, y0 + 2, '#e8a83a');
      [['FRAESE', f], ['DREHEN', d]].forEach(([lab, m], i) => { const y = y0 + 11 + i * 8, on = m.state === 'running', br = m.state === 'broken';
        R(lc, x0 + 3, y, 3, 5, br ? '#4a4652' : on ? '#3a8f4a' : '#8f2f2f'); R(lc, x0 + 3, y + 1, 3, 3, br ? '#6b6672' : on ? '#9cff7a' : '#ff6a5a');
        txt(lc, lab, x0 + 9, y, '#b5afb0'); const nn = br ? '' : String(Math.min(999, m.pend || 0)); for (let k = 0; k < 3; k++) txt(lc, '8', x0 + 47 + k * 4, y, '#2a2230'); txt(lc, nn, x0 + 59 - nn.length * 4, y, '#ffb347'); });
    }
    // Schaltschrank im Eck mit blinkenden Meldeleuchten
    { const x0 = 2, y0 = 90, w = 24, h = FLOOR + 6 - y0; R(lc, 12, 88, 4, 3, '#24182a');
      R(lc, x0 - 1, y0 - 1, w + 2, h + 1, '#3e2731'); R(lc, x0, y0, w, h, '#8f8a92'); R(lc, x0, y0, w, 1, '#d8d2cc'); R(lc, x0, y0, 1, h, '#b5afb0'); R(lc, x0 + w - 1, y0, 1, h, '#6b6672');
      R(lc, x0 + 12, y0 + 2, 1, h - 4, '#6b6672'); R(lc, x0 + 9, y0 + 22, 2, 6, '#3e2731'); R(lc, x0 + 14, y0 + 22, 2, 6, '#3e2731');
      for (let y = y0 + 34; y < y0 + 42; y += 2) R(lc, x0 + 3, y, 6, 1, '#4a4652');
      for (let yy = 0; yy < 5; yy++) R(lc, x0 + 17 - yy / 2, y0 + 30 + yy, 1 + yy, 1, '#e8a83a'); R(lc, x0 + 17, y0 + 32, 1, 2, '#24182a');
      const blink = Math.floor(time * 2.5);
      ['#9cff7a', '#ffd56a', '#ff6a5a', '#9ad0ff'].forEach((c, i) => { const lit = i === 0 ? true : i === 1 ? (blink % 3 === 0) : i === 2 ? ((blink + 1) % 5 === 0) : (blink % 2 === 1);
        R(lc, x0 + 3 + i * 5, y0 + 6, 3, 3, '#24182a'); R(lc, x0 + 4 + i * 5, y0 + 7, 1, 1, lit ? c : '#4a4652'); if (lit) { lc.globalAlpha = .35; R(lc, x0 + 2 + i * 5, y0 + 5, 5, 5, c); lc.globalAlpha = 1; } });
      R(lc, x0 + 3, y0 + 13, 18, 4, '#d8d2cc'); R(lc, x0 + 4, y0 + 14, 9, 1, '#6b6672'); R(lc, x0 + 4, y0 + 16, 12, 0, '#6b6672');
    }
    // Stangen: n Rundstangen übereinander (je 2 Pixel), mit Stirnseiten; als Bündel mit roten Spanngurten
    const rods = (x, y, n, straps) => { for (let i = 0; i < n; i++) { const ry = y + 4 - i * 2; R(lc, x - 14, ry, 28, 1, '#d8d2cc'); R(lc, x - 14, ry + 1, 28, 1, '#8f8a92'); R(lc, x - 14, ry, 1, 2, '#4a4652'); R(lc, x + 13, ry, 1, 2, '#4a4652'); R(lc, x + 13, ry, 1, 1, '#b5afb0'); }
      if (straps && n) for (const sx of [x - 8, x + 7]) R(lc, sx, y + 6 - n * 2, 1, n * 2, '#b8474b'); };
    // Kragarmregal mit Stangenbündeln, rechts an der Wand
    const RX = 342, ARMS = [104, 116, 128];
    for (const cx of [RX - 16, RX + 14]) { R(lc, cx, 94, 3, FLOOR + 4 - 94, '#3b3f4a'); R(lc, cx, 94, 1, FLOOR + 4 - 94, '#6b6672'); R(lc, cx - 1, FLOOR + 2, 5, 2, '#24182a'); }
    R(lc, RX - 16, 92, 33, 2, '#e8a83a'); for (let x = RX - 15; x < RX + 17; x += 4) R(lc, x, 92, 2, 2, '#24182a');
    for (const y of ARMS) for (const cx of [RX - 17, RX + 13]) { R(lc, cx, y, 5, 2, '#4a4652'); R(lc, cx, y, 5, 1, '#8f8a92'); }
    // Kran versorgt die Drehmaschine: holt ein Bündel mit 3 Stangen aus dem Regal und legt es links neben der Maschine ab
    // (Stufe 1–2 auf den Materialbock, Stufe 3 oben auf das Magazin des Stangenladers). Alle 35 s wird eine Stange verbraucht,
    // nach drei Stangen kommt das nächste Bündel. Ist das Regal leer, schiebt sich Nachschub von hinten hinein.
    const CY = 105, K = CLK.kran || (CLK.kran = { t: 25 }); const u0 = K.t % CY; if (d.state === 'running' || u0 < 25) K.t += dt; if (window.FORCE_KRAN !== undefined) K.t = window.FORCE_KRAN;
    const u = K.t % CY, nCyc = Math.floor(K.t / CY), c3 = nCyc % 3; if (u < 25 && (d.state === 'running' || u0 < 25)) SFX.hum('motor', (u >= 5 && u < 12) || u >= 18 ? .2 : .1, SFX.panX(u < 12 ? 300 : 200)); SFX.edge('kran_set', u >= 16 && u < 18, 'clank', { pan: SFX.panX(190), vol: .8 });   /* Hallenkran */
    const TX = 190, HI = 84, TY = dl >= 3 ? 133 : 148;   // Haken-Unterkante beim Ablegen: Bündel liegt direkt auf dem Lader bzw. dem Bock
    let stock = u < 3 ? 3 - c3 : 2 - c3, slide = 0;
    if (c3 === 2 && u >= 60) { stock = 3; slide = Math.round((1 - ease(Math.min(1, (u - 60) / 2.5))) * 34); }
    const pickArm = ARMS[3 - (3 - c3)], RY = pickArm - 6 - 6;
    for (let i = 0; i < stock; i++) rods(RX + slide, ARMS[2 - i] - 6, 3, true);
    if (dl < 3) { for (const lx of [TX - 10, TX + 8]) { R(lc, lx, 160, 2, 12, '#3b3f4a'); R(lc, lx - 2, 171, 6, 1, '#24182a'); } R(lc, TX - 13, 160, 26, 2, '#e8a83a'); R(lc, TX - 13, 161, 26, 1, '#c07a2a'); }   // Materialbock
    let kx = RX, hy = HI, carry = false;
    if (u < 3) hy = HI + (RY - HI) * ease(u / 3);
    else if (u < 5) { hy = RY + (HI - RY) * ease((u - 3) / 2); carry = true; }
    else if (u < 12) { kx = RX + (TX - RX) * ease((u - 5) / 7); carry = true; }
    else if (u < 16) { kx = TX; hy = HI + (TY - HI) * ease((u - 12) / 4); carry = true; }
    else if (u < 18) { kx = TX; hy = TY + (HI - TY) * ease((u - 16) / 2); }
    else if (u < 25) kx = TX + (RX - TX) * ease((u - 18) / 7);
    kx = Math.round(kx); hy = Math.round(hy);
    const e = (u - 16 + CY) % CY, mag = Math.max(1, 3 - Math.floor(e / 35));   // Stangen im Magazin: nach dem Ablegen 3, dann eine weniger alle 35 s
    if (!(carry && u >= 12)) rods(TX, TY + 6, mag, false);
    blit(lc, RUNWAY, 192, 66);
    const ho = blit(lc, HOIST, kx, 75); R(lc, kx - 2, ho.y + 8, 1, hy - 7 - ho.y - 8, '#3e2731'); R(lc, kx + 1, ho.y + 8, 1, hy - 7 - ho.y - 8, '#3e2731'); blit(lc, BLOCK, kx, hy);
    if (carry) { const by = hy + 6; seg(lc, kx, hy, kx - 9, by, '#3e2731', 1); seg(lc, kx, hy, kx + 9, by, '#3e2731', 1); rods(kx, by, 3, true); }
  }
  let DIM = 0;
  function draw(ctx, room, st, t, time, dt) {
    const clock = (id, run) => { const c = CLK[id] || (CLK[id] = { t: time, busy: false }); if (run || c.busy) c.t += dt; return c.t; };
    const settle = (id, run, P, rest) => { const c = CLK[id]; if (run || c.stack === undefined) c.stack = P.stack; else P.stack = c.stack; c.busy = !run && Math.abs(P.w.x - rest) > .5; if (!run && !CLK[id].busy) P.w = { x: rest, pose: ['phone', 'stretch', 'coffee', 'idle', 'wave', 'phone'][(Math.floor(time / 9) + id.length) % 6], dir: P.w.dir || 1 }; return P; };   // Pause: Handy, strecken, Kaffee, winken   // ausgeschaltet: Arbeiter geht zu Ende, dann Pause
    const k = skyAt(t), n = k.night, RM = ROOMS[room], wall = WALLS[room];
    for (const hk in HIT) if (hk.startsWith('g_')) delete HIT[hk];   /* Gimmick-Flächen gelten nur im aktuellen Raum */
    for (const key in HIT) delete HIT[key];
    backdrop(sc, k, FLOOR, time, t);
    lc.clearRect(0, 0, W, H); const L = [], UP = [];
    lc.drawImage(wall.s.c, -1, -1);
    lc.drawImage(ART.cachedLayer('floor_' + RM.floor, H, ART.kq(k.tree, k.night), g => floor(g, k, RM.floor)), 0, 0);   /* Hallenboden aus dem Zwischenbild */
    {   // ruhige Lichtführung im Hintergrund: oben dunkler, Schatten am Wandfuß, Fensterlaibung und Fensterbank, Boden vorne dunkler
      const BAND = (y0, h, a, c) => { lc.globalAlpha = a; R(lc, 0, y0, W, h, c); };
      for (let i = 0; i < 6; i++) BAND(i * 6, 6, .1 - i * .016, '#1d1826');
      BAND(FLOOR - 6, 3, .06, '#1d1826'); BAND(FLOOR - 3, 3, .12, '#1d1826'); BAND(FLOOR, 2, .3, '#1d1826'); BAND(FLOOR + 2, 2, .16, '#1d1826'); BAND(FLOOR + 4, 3, .07, '#1d1826');
      for (let i = 0; i < 4; i++) BAND(H - 16 + i * 4, 4, .04 + i * .03, '#1d1826');
      for (const w2 of wall.wins) { lc.globalAlpha = .35; R(lc, w2.x, w2.y, w2.w, 1, '#1d1826'); R(lc, w2.x, w2.y, 1, w2.h, '#1d1826'); lc.globalAlpha = .45; R(lc, w2.x - 1, w2.y + w2.h + 1, w2.w + 2, 1, '#fffaf0'); lc.globalAlpha = .22; R(lc, w2.x - 1, w2.y + w2.h + 2, w2.w + 2, 1, '#1d1826'); }
      lc.globalAlpha = 1;
    }
    const anyRun = Object.values(st.s || {}).some(x => x.state === 'running') || (room === 'kraftwerk' && st.built);
    const lampsOn = st.built;
    // Lampen
    RM.lamps.forEach(l => {
      if (l.lab) { if (lampsOn) L.push({ x: l.x - 14, y: CEIL_LAB, w: 28, h: 1, c: '#eaf6ff', cone: n > .25, len: 70, a: Math.max(.08, n * 1.2) }); return; }   // Lichtpaneel in der Rasterdecke
      const spr = l.tube ? TUBE : l.pf ? LAMP_PF : l.wall ? LAMP_WALL : l.dome ? LAMP_DOME : LAMP, b = l.tube ? 26 : l.pf ? CEIL_PF + 10 : l.wall ? 58 : l.dome ? 50 : 30;
      const o = blit(lc, spr, l.x, b);
      if (lampsOn) L.push({ x: o.x + (l.tube ? 0 : 1), y: o.y + spr.h - 1, w: l.tube ? 10 : spr.w - 2, h: 1, c: l.tube ? '#eaf6ff' : '#ffd56a', fire: anyRun, cone: true, len: l.pf ? 64 : 74 });
    });
    const ss = id => (st.s && st.s[id]) || { state: 'broken', level: 0 };
    const lv = id => ss(id).state === 'broken' ? 0 : (ss(id).level || 1);
    const shadow = (x, w, y) => { lc.globalAlpha = .22; R(lc, x + 2, y, w - 4, 2, '#1d1826'); R(lc, x + 5, y + 2, w - 10, 1, '#1d1826'); lc.globalAlpha = 1; };   // weicher Bodenschatten
    const put = (id, o) => { HIT[id] = { x: o.x, y: o.y, w: o.s.w, h: o.s.h, station: id }; shadow(o.x, o.s.w, o.y + o.s.h); };
    const crate = (id, cx, top) => { if (ss(id).crate) { const bob = Math.round(Math.sin(time * 2 + cx) * 1.5); const o = blit(lc, CRATE, cx, top - 3 + bob); HIT['crate_' + id] = { x: o.x - 2, y: o.y - 2, w: 16, h: 12, collect: id }; } };
    const lvl = () => {};   // Stufe sieht man an der Ausstattung der Maschine
    const statusLamp = (x, y, run) => L.push({ x, y, w: 3, h: 3, c: run ? '#9cff7a' : '#ff6a5a', fire: true });

    if (room === 'pfoertner') {
      {   // abgetrennter Aggregatraum rechts
        const X0 = 278, top = CEIL_PF + 4;
        R(lc, X0, top, W - X0, FLOOR - top, '#77727e'); for (let y = top; y < FLOOR; y += 7) { R(lc, X0, y, W - X0, 1, '#6b6672'); for (let x = X0 + ((y / 7) % 2) * 9; x < W; x += 18) R(lc, x, y, 1, 7, '#6b6672'); }   // Betonsteinwand
        R(lc, X0, top, W - X0, 2, '#4a4652');
        for (let y = FLOOR; y < H; y++) { const x1 = X0 - Math.round((y - FLOOR) * .35); R(lc, x1, y, W - x1, 1, (y - FLOOR) % 9 === 0 ? '#6b6672' : '#8f8a92'); }   // Betonboden
        for (let y = FLOOR; y < H; y += 2) { const x1 = X0 - Math.round((y - FLOOR) * .35); R(lc, x1 - 2, y, 2, 2, ((y >> 1) % 2) ? '#e8a83a' : '#24182a'); }       // Warnband am Übergang
        R(lc, X0 - 6, top - 4, 7, FLOOR - top + 4, '#d9cbb3'); R(lc, X0 - 6, top - 4, 2, FLOOR - top + 4, '#f4ecdc'); R(lc, X0 - 1, top - 4, 1, FLOOR - top + 4, '#a5703f');   // Pfeiler
        blit(lc, LAMP_PF, 292, CEIL_PF + 10);   // Hängelampe wie links, über der Betonwand neu gezeichnet
        {   // großer Abluftventilator in der Wand: Gehäuse mit Schrauben, fünf Flügel, Schutzring
          const fx = 352, fy = 71, rr = 12; R(lc, fx - 16, fy - 16, 33, 33, '#3e2731'); R(lc, fx - 15, fy - 15, 31, 31, '#6b6672'); R(lc, fx - 15, fy - 15, 31, 1, '#8f8a92'); R(lc, fx - 15, fy - 15, 1, 31, '#8f8a92');
          for (const [bx, by] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) { R(lc, fx + bx, fy + by, 1, 1, '#b5afb0'); R(lc, fx + bx + 1, fy + by + 1, 1, 1, '#3e2731'); }
          const ang = ss('notstrom').state !== 'broken' ? time * 3.2 : .3, sec = Math.PI * 2 / 5; if (ss('notstrom').state !== 'broken') { SFX.hum('fan', .14, .5); if (ss('notstrom').state === 'running') SFX.hum('diesel', .3, .45); }   /* Lüfter und Notstromaggregat */
          for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) { const r = Math.hypot(dx, dy); if (r > rr + .4) continue; let c;
            if (r > rr - .6) c = '#3e2731'; else if (r < 2.4) c = r < 1.2 ? '#8f8a92' : '#4a4652';
            else { const m = (((Math.atan2(dy, dx) - ang - r * .05) % sec) + sec) % sec; c = m < .2 ? '#e8e2da' : m < .62 ? '#b5afb0' : m < .78 ? '#7d7882' : '#24182a'; if (c === '#24182a' && r > rr - 2) c = '#2e2433'; }
            R(lc, fx + dx, fy + dy, 1, 1, c); }
          for (let a = 0; a < 40; a++) { const t2 = a / 40 * Math.PI * 2; R(lc, Math.round(fx + Math.cos(t2) * 7), Math.round(fy + Math.sin(t2) * 7), 1, 1, '#4a4652'); }   // Schutzring
          R(lc, fx - rr, fy, rr * 2 + 1, 1, '#4a4652'); R(lc, fx, fy - rr, 1, rr * 2 + 1, '#4a4652'); R(lc, fx - 1, fy - 1, 3, 3, '#8f8a92'); R(lc, fx, fy, 1, 1, '#3e2731');
        }
      }
      cuckooAt(lc, 14, 84, time); const ko = blit(lc, KEYS, 179, 104); HIT.schluessel = { x: ko.x, y: ko.y, w: ko.s.w, h: ko.s.h, keys: 1, pad: 1 };
      (st.keys || []).forEach((on, i) => { const kx = ko.x + 3 + i * 5, ky = ko.y + 3;   /* Schlüssel je offenem Bereich, sonst nur Schattenriss */
        const c = on ? ['#3e2731', '#e8c25a', '#a8742e'] : [null, '#5e3a2c', '#5e3a2c'];
        const px = (x, y, k) => { if (c[k]) R(lc, kx + x, ky + y, 1, 1, c[k]); };
        for (const [x, y] of [[-1, 0], [0, 0], [1, 0], [-1, 1], [1, 1], [-1, 2], [0, 2], [1, 2]]) px(x, y, 1);
        for (let y = 3; y < 8; y++) px(0, y, y < 5 ? 1 : 2); px(1, 6, 2); px(1, 7, 2);
        if (on) { R(lc, kx, ky + 1, 1, 1, '#3e2731'); R(lc, kx - 1, ky, 1, 1, '#fff2c0'); for (const [x, y] of [[-2, 0], [-2, 1], [-2, 2], [2, 0], [2, 1], [2, 2], [-1, 3], [-1, 4], [-1, 5], [-1, 6], [-1, 7], [1, 3], [1, 4], [1, 5], [2, 6], [2, 7], [0, 8], [1, 8]]) R(lc, kx + x, ky + y, 1, 1, '#3e2731'); }
      });
      // Auftragsbrett (groß): offene Aufträge als Zettel, erledigte mit grünem Haken
      const ao = blit(lc, BOARD_O, 62, 114); HIT.auftraege = { x: ao.x, y: ao.y, w: ao.s.w, h: ao.s.h, orders: 1, pad: 2 };
      const notes = st.orderNotes || [];   /* je Größe ein eigener Zettel: klein gelb, mittel weiße Karte, groß blauer Bauplan */
      notes.forEach((nt, i) => { const spr2 = nt.s === 'klein' ? NOTE_K : nt.s === 'gross' || nt.s === 'groß' ? NOTE_G : NOTE2, o = blit(lc, spr2, ao.x + 30 + (i % 3) * 15, ao.y + 28 + Math.floor(i / 3) * 17 + (i % 2) * 2);
        if (nt.d) CHECK(lc, o.x + Math.floor(o.s.w / 2) - 2, o.y + Math.floor(o.s.h / 2) - 1); });
      // Ehrentafel aus Stein, von unten angestrahlt
      const to = blit(lc, TABLET, 229, FLOOR + 6); HIT.brett = { x: to.x, y: to.y, w: to.s.w, h: to.s.h, brett: 1, pad: 2 };
      const bl = st.badges || [];
      bl.forEach((b, i) => {
        const r = Math.floor(i / 3), c = i % 3, last = r === Math.floor((bl.length - 1) / 3), nn = last ? bl.length - r * 3 : 3;
        const cx = to.x + 33 + (c - (nn - 1) / 2) * 20, bt = to.y + 27 + r * 21;
        const spr = (b.ok ? BADGE_S : BADGE_SG)[b.id]; if (b.ok && b.a < 1 && BADGE_SG[b.id]) { blit(lc, BADGE_SG[b.id], cx, bt); lc.globalAlpha = b.a * b.a; } if (spr) blit(lc, spr, cx, bt); lc.globalAlpha = 1;
      });
      [[to.x - 1, 1], [to.x + to.s.w, -1]].forEach(([sx, dir]) => { const o = blit(lc, SPOT, sx, FLOOR + 20, null, dir < 0); if (st.built) { UP.push({ x: o.x + (dir > 0 ? 3 : 1), y: o.y + 1, len: 92, w: 2, dir }); L.push({ x: o.x + (dir > 0 ? 4 : 0), y: o.y + 1, w: 1, h: 2, c: '#fff3c0', fire: true }); } });
      const dk = DESK_O = blit(lc, DESK, 150, BASE - 6); { const q = gimT('chair', time, 1.4), cw = CHAIR.c.width, chh = CHAIR.c.height, x0 = 182 - Math.floor(CHAIR.w / 2) - 1, y0 = BASE + 3 - CHAIR.h - 1;   /* Bürostuhl dreht sich einmal: 8 Ansichten */
        const VIEWS8 = [[CHAIR, false], [CHAIR_V.f34, false], [CHAIR_V.s, false], [CHAIR_V.b34, false], [CHAIR_V.b, false], [CHAIR_V.b34, true], [CHAIR_V.s, true], [CHAIR_V.f34, true]], vw = q === null ? VIEWS8[0] : VIEWS8[Math.floor(q * 8) % 8];
        blit(lc, vw[0], 182, BASE + 3, null, vw[1]); HIT.g_chair = { x: x0, y: y0, w: cw, h: chh, gim: 'chair' }; } blit(lc, COFFEE, dk.x + 58, dk.y + 14); drawLounge(lc, n, L, st.built, time);
      if (st.built) { [10, 36].forEach((dx, j) => { const sx = dk.x + dx, sy = dk.y + 2; for (let r = 0; r < 4; r++) R(lc, sx + 1, sy + 1 + r * 2, 4 + ((r * 5 + j * 3 + Math.floor(time * .8)) % 9), 1, j ? '#7fd0a0' : '#9ad0ff'); R(lc, sx + 1, sy, 14, 1, '#4f86a6'); if (n > .25) L.push({ x: sx, y: sy, w: 16, h: 9, c: '#9ad0ff', a: .45 }); }); }
      // Notstromaggregat mit Ausbaustufen: Stufe 2 Zusatztank, Stufe 3 zweites Aggregat
      const g = ss('notstrom'), l = lv('notstrom'), on = g.state === 'running';   /* steht still, sobald das Kraftwerk Strom liefert */
      if (l >= 3) { const o2 = blit(lc, GEN2, 368, BASE - 6); if (on) { statusLamp(o2.x + 22, o2.y + 11, true); if (Math.random() < dt * 2) puff(o2.x + 7, o2.y - 1, 'smoke'); } }
      const jit = on && Math.floor(time * 6) % 4 === 0 ? 1 : 0;
      if (l >= 2) {   // Stufe 2: Tagestank auf Wandkonsolen hinter dem Aggregat, Kraftstoffleitung mit Absperrhahn ins Gehäuse
        const tx = 352, ty = FLOOR - 4; for (const bx of [tx - 10, tx + 8]) { R(lc, bx, ty, 3, 8, '#3b3f4a'); R(lc, bx, ty, 1, 8, '#6b6672'); R(lc, bx - 2, ty + 7, 7, 1, '#3b3f4a'); }
        const tk = blit(lc, TANK, tx, ty); const lx = tk.x + 6; R(lc, lx, ty, 2, BASE - 40 - ty + 30, '#3b3f4a'); R(lc, lx, ty, 1, BASE - 40 - ty + 30, '#8f8a92');
        R(lc, lx - 2, ty + 3, 6, 3, '#b8474b'); R(lc, lx - 2, ty + 3, 6, 1, '#e07070'); }
      const o = blit(lc, g.state === 'broken' ? GEN.broken : GEN.ok, 334 + jit, BASE); put('notstrom', o);
      if (on) { L.push({ x: o.x + 32, y: o.y + 24, w: 4, h: 4, c: '#ffd56a', fire: true }); L.push({ x: o.x + 44, y: o.y + 24, w: 4, h: 4, c: '#9cff7a', fire: true }); if (Math.random() < dt * 1.5) puff(o.x + 12, CEIL_PF + 6, 'smoke'); R(lc, o.x + 32, o.y + 14, 2 + Math.round((Math.sin(time * .9) + 1) * 6), 2, '#9cff7a'); }
      { const px = o.x + 11; R(lc, px - 1, CEIL_PF + 4, 5, o.y - CEIL_PF - 3, '#4a4652'); R(lc, px, CEIL_PF + 4, 3, o.y - CEIL_PF - 3, '#8f8a92'); R(lc, px, CEIL_PF + 4, 1, o.y - CEIL_PF - 3, '#b5afb0');   // Abgasrohr nach oben durch die Decke
        for (const y of [CEIL_PF + 10, CEIL_PF + 34, o.y - 6]) R(lc, px - 2, y, 7, 2, '#3b3f4a'); R(lc, px - 4, CEIL_PF + 4, 11, 3, '#3b3f4a'); }
      lvl('notstrom', 334, BASE); crate('notstrom', 334, o.y);
    }
    if (room === 'blechwerkstatt') {
      { const q = gimT('peg', time, 9), T = q === null ? -1 : q * 9, back = T < 0 || T > 5.9, pg = blit(lc, back ? PEG : PEG_E, 48, FLOOR - 12); HIT.g_peg = { x: pg.x, y: pg.y, w: PEG.c.width, h: PEG.c.height, gim: 'peg' };   /* Hammer fällt, ein Arbeiter hebt ihn auf */
        if (!back) { const hx = pg.x + 4, fy = FLOOR + 5;   /* landet hinten an der Wand, hinter Spind und Tisch */
          const HC = '#6b6672', SC = '#7f5236';   /* gleiche Form und Farbe wie an der Wand, ohne Umriss */
          if (T < .45) { const yy = pg.y + 4 + Math.round((fy - 12 - pg.y - 4) * (T / .45) * (T / .45)); R(lc, hx - 3, yy, 6, 3, HC); R(lc, hx - 1, yy + 3, 2, 8, SC); }   /* fällt in der Form, in der er an der Wand hing */
          else if (T < 4.9) { R(lc, hx - 3, fy - 5, 3, 6, HC); R(lc, hx, fy - 3, 8, 2, SC); }   /* liegt um 90° gedreht, bis er aufgehoben wird */
          SFX.edge('pegLand', T > .45, 'clank', { pan: SFX.panX(hx), vol: .6 });
          const Wb = WORKERS.set('big', 5), fy2 = FLOOR + 7, wx = T < 2.2 ? null : T < 4.4 ? Math.round(-14 + (hx + 2 + 14) * Math.min(1, (T - 2.2) / 2)) : hx + 2;   /* läuft hin, hebt auf, hält, hängt ein */
          if (wx !== null) { const walking = T < 4.4, holding = T >= 4.9 && T < 5.4, toWall = T >= 5.4, fr = walking ? Wb.walk[Math.floor(T * 8) % Wb.walk.length] : holding ? Wb.carry[0] : Wb.idle[0];
            if (toWall) blit(lc, WORKERS.frontB(5, true)[T < 5.75 ? 4 : 1], wx, fy2); else blit(lc, fr, wx, fy2, null, false);   /* dreht sich zur Wand (Rückenansicht) und hängt den Hammer ein */
            if (holding) { R(lc, wx + 1, fy2 - 19, 6, 3, '#6b6672'); R(lc, wx + 3, fy2 - 16, 2, 5, '#7f5236'); } }   /* Hammer in den Händen vor der Brust */
          SFX.edge('pegHang', T > 5.9, 'clink', { pan: SFX.panX(hx), vol: .6 });
        }
        if (q !== null && T > 5.9) { const Wb = WORKERS.set('big', 5), hx = pg.x + 4, ox2 = Math.round(hx + 2 - Math.max(0, T - 6.2) / 2.8 * (hx + 30)); if (T < 6.2) blit(lc, WORKERS.frontB(5, true)[1], hx + 2, FLOOR + 7); else blit(lc, Wb.walk[Math.floor(T * 8) % Wb.walk.length], ox2, FLOOR + 7, null, true); }   /* bleibt sichtbar: erst noch zur Wand gewandt, dann dreht er sich um und geht */   /* Arbeiter geht wieder */ } blit(lc, EXT, 90, FLOOR - 14); blit(lc, POSTER, 246, FLOOR - 30); clockAt(lc, 111, 108, 'B', time);
      const p = ss('abkant'), run = p.state === 'running', pl = lv('abkant');
      // Brückenkran: Laufbahn oben, gelbe Laufkatze mit Unterflasche; hebt die Bleche einzeln vom Stapel auf die Auflage
      blit(lc, RUNWAY, 192, 24);
      const Ta = clock('abkant', run), AC = run ? abkantCycle(Ta) : { kx: AK.stack, hookRel: 1, sheet: 'die', b: 22, depth: 0, angle: 0, part: null };
      if (run) { const tt = Ta % AK.P, mv = tt < 1.2 || (tt >= 5 && tt < 6.3), up = (tt >= 1.2 && tt < 3.2) || (tt >= 6.3 && tt < 8.3) || tt >= 8.7;   /* Kran surrt, Presse schlägt zu, Teil fällt in die Gitterbox */
        SFX.hum('hoist', mv ? .26 : up ? .14 : 0, SFX.panX(AC.kx));   /* Kran: leises Hubwerk, bleibt unter der Presse */ SFX.hum('spindle', .16, SFX.panX(180)); SFX.edge('ak_press', tt >= 5.9 && tt < 6.5, 'press', { pan: SFX.panX(180) }); SFX.edge('ak_drop', tt >= 9.5, 'drop', { pan: SFX.panX(255), vol: .8 }); }
      const sheetTopY = BASE - 28, stackTop = BASE - 15, HIGH = 52;
      const kx = Math.round(AC.kx);
      let sheetY = null, hookY;   // hookY = Lasthaken (Unterkante Flasche)
      if (AC.sheet === 'crane' || AC.held) { sheetY = AC.set !== undefined ? (sheetTopY - 8) + 8 * AC.set : AC.lift !== undefined ? stackTop + (sheetTopY - 8 - stackTop) * AC.lift : stackTop; hookY = sheetY - 5; }
      else if (AC.hook === 'down') hookY = HIGH + (stackTop - 5 - HIGH) * AC.hq;
      else hookY = (sheetTopY - 5) + (HIGH - sheetTopY + 5) * (AC.hookRel || 0);
      hookY = Math.round(hookY);
      const ho = blit(lc, HOIST, kx, 33);
      R(lc, kx - 2, ho.y + 8, 1, hookY - 7 - ho.y - 8, '#3e2731'); R(lc, kx + 1, ho.y + 8, 1, hookY - 7 - ho.y - 8, '#3e2731');
      blit(lc, BLOCK, kx, hookY);
      if (sheetY !== null) { const sy = Math.round(sheetY); seg(lc, kx, hookY, kx - 12, sy, '#3e2731', 1); seg(lc, kx, hookY, kx + 12, sy, '#3e2731', 1); drawBend(lc, kx, sy, 0); }
      { const lo = blit(lc, LOCKER, 12, BASE - 12), q = gimT('spind', time, 3.2); HIT.g_spind = { x: lo.x, y: lo.y, w: LOCKER.c.width, h: LOCKER.c.height, gim: 'spind' };   /* blauer Spind: geht auf, manchmal liegt etwas darin */
        const half = q !== null && (q < .1 || q > .9);   /* nur die linke Tür geht auf: erst halb, dann ganz; die rechte bleibt zu */
        if (q !== null) { R(lc, lo.x + (half ? 5 : 2), lo.y + 2, half ? 4 : 7, 34, '#1d1826'); for (const yy of [12, 24]) R(lc, lo.x + 2, lo.y + yy, 7, 1, '#4a4652'); R(lc, lo.x + 3, lo.y + 4, 2, 7, '#7f5236');
          if (GIM.spind && GIM.spind.reward) { for (let i = 0; i < 3; i++) { R(lc, lo.x + 3, lo.y + 32 - i * 2, 5, 1, '#d8d2cc'); R(lc, lo.x + 3, lo.y + 33 - i * 2, 5, 1, '#8f8a92'); } if (!half && q < .8) { const ty = lo.y - 6 - Math.round(q * 8); R(lc, lo.x + 2, ty + 2, 3, 1, '#e8a83a'); R(lc, lo.x + 3, ty + 1, 1, 3, '#e8a83a'); txt(lc, '5', lo.x + 6, ty, '#e8a83a'); } }
          if (half) { R(lc, lo.x + 1, lo.y, 5, 38, '#2f5d78'); R(lc, lo.x + 1, lo.y, 1, 38, '#7fb6d6'); R(lc, lo.x + 5, lo.y, 1, 38, '#1f3f52'); R(lc, lo.x + 3, lo.y + 18, 1, 3, '#d8d2cc'); }   /* Tür halb offen: schräg zum Betrachter */
          else { R(lc, lo.x, lo.y - 1, 2, 40, '#2f5d78'); R(lc, lo.x, lo.y - 1, 1, 40, '#7fb6d6'); } } }   /* Tür ganz offen: von der Kante */ blit(lc, LEAN, 74, BASE - 12); blit(lc, LEAN, 78, BASE - 12); blit(lc, BROOM, 292, BASE - 10);
      blit(lc, SHEETS, 104, BASE - 2); blit(lc, BARRELS, 376, BASE);
      blit(lc, BENCH, 48, BASE - 10);
      // Teilelager: Stufe 1 Holzregal, 2 hohes Holzregal, 3 Stahl-Hochregal mit Hebebühne
      const sh2 = ss('lager'), ll = lv('lager');
      const so = blit(lc, sh2.state === 'broken' ? SHELF_B : RACK[Math.min(3, ll)], 330, BASE - 6); put('lager', so); lvl('lager', 330, BASE - 6);
      // Abkantbank
      const GBX = 255;   // Gitterbox für fertige Kantteile, darin stapeln sich bis zu drei Teile
      const PT = settle('abkant', run, porter(Ta, { P: AK.P, land: AK.land, src: GBX - 12, dst: 306, rest: 236, restAct: 'work' }), 236);
      const PR = PRESSL[Math.max(1, Math.min(3, pl)) - 1], o = blit(lc, p.state === 'broken' ? PR.broken : PR.ok, 180, BASE); put('abkant', o); if (sheetY !== null) { const sy = Math.round(sheetY); seg(lc, kx, hookY, kx - 12, sy, '#3e2731', 1); seg(lc, kx, hookY, kx + 12, sy, '#3e2731', 1); drawBend(lc, kx, sy, 0); }   /* Blech am Kran liegt vor der Maschine, wie nach dem Absetzen */
      if (pl >= 2 && p.state !== 'broken') { const hp = blit(lc, HPU, o.x + 70, o.y + 1); R(lc, o.x + 22, o.y - 1, hp.x - o.x - 22, 1, '#24182a'); R(lc, o.x + 62, o.y - 2, 1, 2, '#24182a'); if (run) R(lc, hp.x + 3, hp.y + 5 + Math.floor((Math.sin(time * 2) + 1) * 1.5), 2, 1, '#e8a83a'); }
      const gOff = !run ? 0 : AC.sheet === 'rest' ? 4 : AC.sheet === 'slide' ? Math.round(4 * (1 - AC.slide)) : 0;   // Hinteranschlag fährt vor jedem Biegen in Position
      if (pl >= 2) blit(lc, BACKGAUGE, o.x + 42 + gOff, o.y + 31);
      const cx0 = o.x + 42, sheetTop = o.y + 32;
      R(lc, cx0 - 2, o.y + 35, 4, 1, '#24182a'); R(lc, cx0 - 1, o.y + 36, 2, 1, '#24182a');      // V-Nut im Unterwerkzeug
      // Auflage links (hier setzt der Kran ab) und Rollenbahn rechts
      for (const x of [112, 136]) { R(lc, x, sheetTop + 2, 2, BASE - sheetTop - 2, '#4a4652'); R(lc, x, sheetTop + 2, 1, BASE - sheetTop - 2, '#6b6672'); }
      R(lc, 108, sheetTop + 1, 32, 2, '#8f8a92'); R(lc, 108, sheetTop + 1, 32, 1, '#b5afb0');
      R(lc, o.x + 82, sheetTop + 2, 22, 2, '#4a4652'); for (let x = o.x + 83; x < o.x + 104; x += 3) R(lc, x, sheetTop + 1, 2, 1, '#b5afb0');
      R(lc, o.x + 100, sheetTop + 4, 2, BASE - sheetTop - 4, '#4a4652');
      for (let i = 0; i < PT.stack; i++) drawBend(lc, GBX, BASE - 4 - i * 3, .62);
      if (p.state !== 'broken') {
        if (AC.sheet === 'rest') drawBend(lc, AK.rest, sheetTop, 0);
        else if (AC.sheet === 'slide') drawBend(lc, Math.round(AK.rest + (cx0 - AK.rest) * AC.slide), sheetTop, 0);
        else if (AC.sheet === 'die') drawBend(lc, cx0, sheetTop + AC.depth, AC.angle);
        if (AC.part) { const edge = o.x + 104;   // rollt bis zum Ende der Rollenbahn, kippt über die Kante und fliegt im Bogen in die Gitterbox
          if (AC.part.roll !== undefined) drawBend(lc, Math.round(cx0 + (edge - cx0) * AC.part.roll), sheetTop, .62);
          else { const q = AC.part.drop, k = Math.min(2, PT.stack); drawBend(lc, Math.round(edge + (GBX - edge) * q), Math.round(sheetTop + (BASE - 4 - k * 3 - sheetTop) * q * q), .62); } }
      }
      if (pl >= 3 && p.state !== 'broken') {   // Biegehelfer: zwei Stützarme heben das Blech beim Biegen mit an
        const a = AC.sheet === 'die' ? AC.angle : 0, py = sheetTop + (AC.sheet === 'die' ? AC.depth : 0) + 3, c = Math.cos(a), sn = Math.sin(a);
        for (const dir of [-1, 1]) { const bx = cx0 + dir * 5; R(lc, bx - 1, py - 1, 3, 3, '#3e2731'); R(lc, bx, py, 1, 1, '#d8d2cc');
          for (let i = 2; i <= 15; i++) { const x = Math.round(bx + dir * i * c), y = Math.round(py - i * sn); R(lc, x, y, 1, 1, i % 4 === 0 ? '#24182a' : '#e8a83a'); R(lc, x, y + 1, 1, 1, '#7a4a1c'); } }
      }
      blit(lc, GBOX, GBX, BASE);
      if (p.state === 'broken') { blit(lc, RAM_B, o.x - 22, BASE, null); blit(lc, SHEET, cx0, o.y + 34); } else blit(lc, RAM, cx0, o.y + AC.b);
      if (pl >= 3 && p.state !== 'broken') { const cp = blit(lc, CNCP, o.x + 96, BASE); L.push({ x: cp.x + 2, y: cp.y + 2, w: 14, h: 7, c: '#9ad0ff', a: .4 }); blit(lc, TOWERL, o.x + 8, o.y + 1); L.push({ x: o.x + 7, y: o.y - 6, w: 1, h: 1, c: run ? '#9cff7a' : '#ffd56a', fire: true }); } else blit(lc, PANEL, o.x + 96, BASE);
      if (pl >= 3) { [o.x + 14, o.x + 70].forEach(cx => { blit(lc, CURTAIN, cx, BASE + 2); if (run) L.push({ x: cx - 1, y: BASE - 20, w: 1, h: 1, c: '#ff5a4a', fire: true, a: .8 }); }); }
      if (p.state !== 'broken') statusLamp(o.x + 4, o.y + 18, run);
      if (st.built && p.state !== 'broken') drawPorter(lc, PT.w, 1, time);
      lvl('abkant', 180, BASE); crate('abkant', 180, o.y);
      if (ll >= 3) {   // Hebebühne steht vor dem Hochregal, vor allem anderen gezeichnet
        const up = (Math.sin(time * .22) + 1) / 2, e2 = ease(up), deckB = BASE - 2 - Math.round(e2 * 52), lx = 314; SFX.hum('hydraulic', .22 * Math.abs(Math.cos(time * .22)), SFX.panX(lx));   /* Hebebühne: weiches Hydraulikzischen */
        const n2 = 4, hgt = BASE - 2 - deckB;
        for (let i = 0; i < n2; i++) { const y0 = deckB + i * hgt / n2, y1 = deckB + (i + 1) * hgt / n2; seg(lc, lx - 9, y0, lx + 9, y1, '#e8a83a', 1); seg(lc, lx + 9, y0, lx - 9, y1, '#c07a2a', 1); }
        blit(lc, LIFT_DECK, lx, deckB); blit(lc, LIFT_RAIL, lx + 6, deckB - 3);
        R(lc, lx - 12, BASE - 3, 24, 3, '#4a4652'); R(lc, lx - 12, BASE - 3, 24, 1, '#6b6672');
        blit(lc, CRATE, lx - 3, deckB - 3);
      }
    }
    if (room === 'maschinenhalle') {
      const f = ss('fraese'), d = ss('dreh'), fl = lv('fraese'), dl = lv('dreh');
      hallWall(lc, f, d, dl, time, dt);
      blit(lc, WARN, 373, 104); blit(lc, EXT, 31, 120); blit(lc, BARRELS, 364, BASE);
      {   // Zuführband von hinten: bringt die Rohteile von der Rückwand nach vorn an die Fräse (perspektivisch schräg nach hinten)
        const fx = 100 - Math.floor(MILL.ok.w / 2), yb = BASE - 70 + 44, yt = FLOOR + 3, run = f.state === 'running';
        const L0 = (y, b, t) => Math.round(b + (t - b) * (yb - y) / (yb - yt));
        for (let y = yt; y <= yb; y++) { const xl = L0(y, fx + 45, fx + 53), xr = L0(y, fx + 71, fx + 73);
          R(lc, xl, y, xr - xl, 1, ((y + Math.floor((run ? (CLK.fraese || { t: 0 }).t : 0) * 6)) % 3) ? '#3b3f4a' : '#4a4652'); R(lc, xl - 1, y, 1, 1, '#8f8a92'); R(lc, xr, y, 1, 1, '#6b6672'); }
        R(lc, fx + 52, yt - 1, 22, 1, '#8f8a92'); R(lc, fx + 45, yb + 1, 27, 2, '#6b6672'); R(lc, fx + 45, yb + 1, 27, 1, '#b5afb0');
        for (const lx of [fx + 48, fx + 68]) R(lc, lx, yb + 3, 2, BASE - yb - 3, '#4a4652');
        const mb = run ? millCycle((CLK.fraese || { t: 0 }).t) : null;
        if (mb && mb.inn === undefined) { const p = (((CLK.fraese || { t: 0 }).t / 5.5) % 1), q = Math.max(0, Math.min(1, (p - .4) / .42)), y = Math.round(yt + (yb - 5 - yt) * q), w = Math.round(18 + 6 * q), hh = q > .6 ? 5 : 4, x = L0(y, fx + 46, fx + 54);
          R(lc, x, y, w, hh, '#a8c0cc'); R(lc, x, y, w, 1, '#d6f0f4'); R(lc, x + w - 1, y, 1, hh, '#6b6672'); R(lc, x, y + hh - 1, w, 1, '#6b6672'); }   // Rohteil kommt auf dem Band nach vorn
      }
      const fo = blit(lc, f.state === 'broken' ? MILL.broken : MILL.ok, 100, BASE); put('fraese', fo);
      if (fl >= 2) { blit(lc, TOOLCH, fo.x + 54, fo.y + 26); const cu = blit(lc, COOLANT, fo.x + 70, BASE); if (f.state === 'running') L.push({ x: cu.x + 3, y: cu.y + 3, w: 1, h: 1, c: '#9cff7a', fire: true });   // Kühlmittelanlage (Pumpe läuft)
        R(lc, fo.x + 6, fo.y + 6, 1, 4, '#4a4652'); R(lc, fo.x + 6, fo.y + 6, 8, 1, '#4a4652'); R(lc, fo.x + 12, fo.y + 6, 4, 2, '#e8a83a'); if (f.state === 'running') L.push({ x: fo.x + 12, y: fo.y + 8, w: 4, h: 1, c: '#fff3c0', a: .7 }); }   // Arbeitsleuchte
      // Fräsen: Fräser senkt sich, Werkstück fährt unter dem drehenden Fräser durch, oben entsteht eine Nut, Späne fliegen
      const Tf = clock('fraese', f.state === 'running'), mc = f.state === 'running' ? millCycle(Tf) : { down: 0, feed: 0, cutting: false };
      if (f.state === 'running') { SFX.hum('spindle', .2, SFX.panX(fo.x + 20)); SFX.hum('mill', mc.cutting ? .32 : 0, SFX.panX(fo.x + 20)); SFX.hum('conveyor', mc.inn !== undefined ? .14 : .05, SFX.panX(fo.x + 50)); SFX.edge('mill_drop', mc.out !== undefined && mc.out > .9, 'drop', { pan: SFX.panX(fo.x - 26) }); }   /* Fräse */
      const spX = fo.x + 21, wpW = 24, wpTop = fo.y + 39, boxX = fo.x - 26;
      const MP = settle('fraese', f.state === 'running', porter(Tf, { P: 5.5, land: 5.5 * .82, src: boxX + 10, dst: -12, rest: fo.x + 14, restAct: 'work', speed: 14 }), fo.x + 14);
      let wpL = spX + 3 - Math.round(mc.feed * (wpW + 1)), wpY = wpTop;
      if (mc.out !== undefined) { const q = mc.out, qx = Math.min(1, q / .72), qy = Math.max(0, (q - .72) / .28); wpL = Math.round(wpL + (boxX - 12 - wpL) * ease(qx)); wpY = Math.round(wpTop + (BASE - 11 - Math.min(2, MP.stack) * 4 - wpTop) * qy * qy); }   // über die Rollenbahn nach links, dann senkrecht in die Kiste
      if (mc.inn !== undefined) wpL = Math.round(spX + 3 + (1 - mc.inn) * 22);
      {
        R(lc, wpL, wpY, wpW, 5, '#a8c0cc'); R(lc, wpL, wpY, wpW, 1, '#d6f0f4'); R(lc, wpL + wpW - 1, wpY, 1, 5, '#6b6672'); R(lc, wpL, wpY + 4, wpW, 1, '#6b6672');
        const groove = mc.done ? wpW : mc.cutting ? Math.max(0, Math.min(wpW, spX + 2 - wpL)) : 0;
        if (groove > 0) { R(lc, wpL, wpY, groove, 2, '#4a4652'); R(lc, wpL, wpY + 2, groove, 1, '#d8d2cc'); }
        lc.globalAlpha = 1;
      }
      if (f.state !== 'broken') { const spB = fo.y + 31 + Math.round(mc.down * 11); R(lc, spX - 2, fo.y + 22, 3, spB - 9 - fo.y - 22, '#b5afb0'); R(lc, spX - 2, fo.y + 22, 1, spB - 9 - fo.y - 22, '#d8d2cc'); blit(lc, SPINDLE[f.state === 'running' ? Math.floor(time * 18) % 2 : 0], spX, spB); }
      if (mc.cutting && Math.random() < .8) puff(spX + 2, wpTop - 1, 'chip');
      if (fl >= 2 && f.state !== 'broken') {
        const nz = fo.y + 22; R(lc, spX + 3, nz, 2, 2, '#4a4652'); for (let j = 0; j < 7; j++) R(lc, spX + 4 + (j > 4 ? 1 : 0), nz + 2 + j, 1, 1, j % 2 ? '#2f8a7e' : '#1f5a5a');   // Kühlmitteldüse am Fräskopf
        if (mc.cutting) for (let k = 0; k < 4; k++) { const q = ((time * 9 + k / 4) % 1); R(lc, spX + 5 - Math.round(q * 3), Math.round(nz + 9 + q * (wpTop - nz - 9)), 1, 1, k % 2 ? '#9ad0ff' : '#c2e2e6'); }   // Strahl auf den Fräser
        const tc = [fo.x + 54, fo.y + 17], cyc = Math.floor(Tf / 5.5), rot = (cyc + (mc.inn !== undefined ? mc.inn : 0)) * Math.PI / 4;   // Werkzeugwechsler dreht nach jedem Teil eine Tasche weiter
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + rot; R(lc, tc[0] + Math.round(Math.cos(a) * 5), tc[1] + Math.round(Math.sin(a) * 5), 1, 1, k === 0 ? '#24182a' : k % 2 ? '#e8a83a' : '#d8d2cc'); }
      }
      if (fl >= 3) { lc.globalAlpha = .22; R(lc, fo.x + 1, fo.y + 24, 54, 34, '#c2e2e6'); lc.globalAlpha = 1; blit(lc, ENCL, fo.x + 28, fo.y + 62); }
      if (f.state !== 'broken') { statusLamp(fo.x + 24, fo.y + 12, f.state === 'running'); }
      // Rollenbahn links aus der Maschine und Holzkiste für die gefrästen Teile (bis zu drei stapeln sich, dann holt sie jemand ab)
      R(lc, boxX + 13, wpTop + 5, fo.x - boxX - 12, 2, '#4a4652'); for (let x = boxX + 14; x < fo.x + 1; x += 3) R(lc, x, wpTop + 5, 2, 1, '#b5afb0'); R(lc, boxX + 16, wpTop + 7, 2, BASE - wpTop - 7, '#4a4652');
      for (let i = 0; i < MP.stack; i++) { const y = BASE - 11 - i * 4; R(lc, boxX - 12, y, 24, 5, '#a8c0cc'); R(lc, boxX - 12, y, 24, 1, '#d6f0f4'); R(lc, boxX - 12, y, 24, 2, '#4a4652'); R(lc, boxX - 12, y + 2, 24, 1, '#d8d2cc'); R(lc, boxX - 12, y + 4, 24, 1, '#6b6672'); }
      R(lc, boxX - 15, BASE - 9, 30, 9, '#7f5236'); R(lc, boxX - 15, BASE - 9, 30, 2, '#cf9a5c'); for (let x = boxX - 13; x < boxX + 14; x += 6) R(lc, x, BASE - 6, 1, 5, '#5c3a2e'); R(lc, boxX - 15, BASE - 1, 30, 1, '#3e2731');
      if (f.state !== 'broken') drawPorter(lc, MP.w, 0, time);
      lvl('fraese', 100, BASE); crate('fraese', 100, fo.y);
      let dreh_porter = null;
      const lo = blit(lc, d.state === 'broken' ? LATHE.broken : LATHE.ok, 262, BASE); put('dreh', lo); const Td = clock('dreh', d.state === 'running');
      if (dl >= 3) { const bl = blit(lc, BARLOAD, lo.x - 23, lo.y + 39);   // Stangenlader: Schieber drückt die Stange nach, nach 5 Teilen rollt eine neue aus dem Magazin
        if (d.state !== 'broken') { const lq = d.state === 'running' ? latheCycle(Td) : {}, k = Math.floor(Td / 7) % 5, fq = lq.feed !== undefined ? lq.feed : 0;
          const pos = k === 4 && lq.feed !== undefined ? 4 / 5 * (1 - fq) : (k + fq) / 5, x0 = bl.x + 2, x1 = bl.x + 47, px = Math.round(x0 + pos * 38);
          R(lc, x0, bl.y + 1, x1 - x0, 3, '#24182a'); R(lc, px + 3, bl.y + 2, x1 - px - 3, 2, '#a6abb1'); R(lc, px + 3, bl.y + 2, x1 - px - 3, 1, '#d8d2cc');   /* Stange auf Höhe der Drehwelle */   // Schlitz mit Stange
          R(lc, px, bl.y, 3, 4, '#c07a2a'); R(lc, px, bl.y, 3, 1, '#f7d86a');                                                                                // Schieber
          if (k === 4 && lq.feed !== undefined) { const y = Math.round(bl.y + 6 + (1 - fq) * 0); R(lc, bl.x + 4, y - Math.round(fq * 4), 36, 1, '#fffaf0'); } } }
      if (d.state !== 'broken') {
        const runL = d.state === 'running', lc2 = runL ? latheCycle(Td) : { x: 1, cutting: false };
        if (runL) { SFX.hum('spindle', .2, SFX.panX(lo.x + 50)); SFX.hum('lathe', lc2.cutting ? .3 : 0, SFX.panX(lo.x + 50)); SFX.edge('lathe_drop', lc2.drop !== undefined && lc2.drop > .85, 'drop', { pan: SFX.panX(lo.x + 50) }); if (dl >= 2) SFX.hum('conveyor', .08, SFX.panX(lo.x + 120)); }   /* Drehmaschine */
        blit(lc, CHUCK[runL ? Math.floor(time * 10) % 2 : 0], lo.x + 25, lo.y + 22);
        // Welle zwischen Futter und Reitstock: roh (dick, dunkel) vor dem Meißel, gedreht (dünn, blank) dahinter
        const x0 = lo.x + 28, x1 = lo.x + 86, toolX = Math.round(lo.x + 28 + lc2.x * 54)   /* Meißel fährt bis ans Futter: die ganze Welle wird gedreht */, cutTo = lc2.cutting ? toolX : x1;
        // Auffangwanne vor dem Bett: fertige Wellen sammeln sich, nach dreien holt sie jemand ab
        const DP = settle('dreh', runL, porter(Td, { P: 7, land: 7 * .8, src: lo.x + 57, dst: 352, rest: lo.x + 16, restAct: 'work', speed: 14 }), lo.x + 16);
        dreh_porter = DP;
        const trayY = lo.y + 40;
        for (let i = 0; i < DP.stack; i++) { R(lc, x0 + 2 + i * 2, trayY - 2 - i * 2, x1 - x0 - 4, 2, '#d8d2cc'); R(lc, x0 + 2 + i * 2, trayY - 2 - i * 2, x1 - x0 - 4, 1, '#fffaf0'); }
        if (lc2.drop !== undefined) { const q = lc2.drop, y = Math.round(lo.y + 17 + (trayY - 2 - Math.min(2, DP.stack) * 2 - lo.y - 17) * q * q); R(lc, x0, y, x1 - x0, 2, '#d8d2cc'); R(lc, x0, y, x1 - x0, 1, '#fffaf0'); }   // fertige Welle fällt in die Wanne
        R(lc, x0 - 3, trayY, x1 - x0 + 6, 3, '#4a4652'); R(lc, x0 - 3, trayY, x1 - x0 + 6, 1, '#8f8a92'); R(lc, x0 - 3, trayY - 3, 1, 3, '#4a4652'); R(lc, x1 + 2, trayY - 3, 1, 3, '#4a4652');
        const xEnd = lc2.drop !== undefined ? x0 : lc2.feed !== undefined ? Math.round(x0 + (x1 - x0) * lc2.feed) : x1;     // neue Stange wird durch das Futter nachgeschoben
        for (let x = x0; x < xEnd; x++) {
          const turned = lc2.cutting ? x > toolX : false, stripe = runL && ((x + Math.floor(time * 14)) % 5 === 0);
          if (turned) { R(lc, x, lo.y + 17, 1, 2, stripe ? '#fffaf0' : '#d8d2cc'); R(lc, x, lo.y + 18, 1, 1, '#b5afb0'); }
          else { R(lc, x, lo.y + 16, 1, 4, stripe ? '#a6abb1' : '#7c818a'); R(lc, x, lo.y + 16, 1, 1, '#a6abb1'); R(lc, x, lo.y + 19, 1, 1, '#565b66'); }
        }
        void cutTo;
        R(lc, toolX - 1, lo.y + 20, 2, 3, '#d8d2cc'); R(lc, toolX - 1, lo.y + 20, 1, 1, '#fffaf0');            // Drehmeißel
        blit(lc, dl >= 2 ? TURRET : CARRIAGE, toolX, lo.y + 28);
        if (lc2.cutting && Math.random() < .7) puff(toolX, lo.y + 20, 'chip');
        statusLamp(lo.x + 16, lo.y + 10, d.state === 'running');
      }
      if (dl >= 2) { const co = blit(lc, CHIPCONV, lo.x + 116, BASE); if (d.state === 'running') { const q = (time * 6) % 30; if (q < 24) R(lc, co.x + 2 + q, co.y + 20 - Math.floor(q * .75), 2, 1, '#d8d2cc'); else R(lc, co.x + 27, co.y + 2 + Math.round((q - 24) / 6 * 3), 1, 1, '#d8d2cc'); } }   // Späneförderer: Späne fallen oben in den Spänewagen
      if (d.state !== 'broken' && dreh_porter) drawPorter(lc, dreh_porter.w, 4, time);
      lvl('dreh', 262, BASE); crate('dreh', 262, lo.y);
    }
    if (room === 'prueflabor') {
      clockAt(lc, 153, 66, 'L', time); { const pl = wiggle(lc, BIGPLANT, 152, BASE - 9, gimT('plantL', time, 1.2)); HIT.g_plantL = { x: pl.x, y: pl.y, w: BIGPLANT.c.width, h: BIGPLANT.c.height, gim: 'plantL' }; }   // Pflanze links hinter dem Messtisch
      { const kx = 22, ky = 94; R(lc, kx - 1, ky - 1, 22, 18, '#24182a'); R(lc, kx, ky, 20, 16, '#2f7a3a'); R(lc, kx, ky, 20, 1, '#5ab86a'); R(lc, kx, ky + 15, 20, 1, '#1f5a2a'); R(lc, kx + 7, ky - 3, 6, 2, '#3e2731');   // großer Verbandskasten mit Griff
        R(lc, kx + 8, ky + 3, 4, 10, '#fffaf0'); R(lc, kx + 5, ky + 6, 10, 4, '#fffaf0'); R(lc, kx + 1, ky + 7, 1, 2, '#d8d2cc'); }
      {   // Rückwand: Klimaanzeige (Labor auf 20 °C geregelt), Augendusche an den Fliesen
        const cx = 229, cy = 56; R(lc, cx - 12, cy - 1, 25, 17, '#3e2731'); R(lc, cx - 11, cy, 23, 15, '#1d1a26'); R(lc, cx - 11, cy, 23, 1, '#4a4652');
        txt(lc, '20', cx - 8, cy + 2, '#9cff7a'); R(lc, cx, cy + 2, 1, 1, '#9cff7a'); txt(lc, 'C', cx + 2, cy + 2, '#9cff7a');
        txt(lc, 'RH', cx - 8, cy + 8, '#7fb6d6'); txt(lc, String(44 + Math.floor((time / 9) % 3)), cx + 1, cy + 8, '#7fb6d6');
        const ex = 54, ey = 94; R(lc, ex - 6, ey, 13, 9, '#2f7a3a'); R(lc, ex - 5, ey + 1, 11, 7, '#3a9a4a'); R(lc, ex - 1, ey + 2, 3, 1, '#fffaf0'); R(lc, ex - 2, ey + 3, 5, 2, '#fffaf0'); R(lc, ex - 1, ey + 5, 1, 2, '#fffaf0'); R(lc, ex + 1, ey + 5, 1, 2, '#fffaf0');   // Schild Augendusche
        R(lc, ex - 1, ey + 10, 2, 9, '#8f8a92'); R(lc, ex - 1, ey + 10, 1, 9, '#d8d2cc'); R(lc, ex - 6, ey + 13, 12, 2, '#9cc65a'); R(lc, ex - 5, ey + 15, 10, 1, '#467a42'); R(lc, ex - 4, ey + 12, 2, 1, '#467a42'); R(lc, ex + 2, ey + 12, 2, 1, '#467a42');
        R(lc, ex + 5, ey + 16, 4, 1, '#e8a83a'); R(lc, ex + 8, ey + 14, 1, 3, '#e8a83a');
      }
      {   // Messplatz: Prüferin misst die fertigen Teile nach, Kurve auf dem Monitor, Messuhr zeigt aus
        const qb = blit(lc, QBENCH, 196, BASE - 4), qx = qb.x, qy = qb.y, on = st.built, mt = time % 6, meas = on && mt > 1.5 && mt < 4.5;
        blit(lc, SCOPE, qx + 9, qy + 9);
        const prb = qy + 1 + Math.round(meas ? (mt < 2.2 ? (mt - 1.5) / .7 * 5 : mt > 3.8 ? (4.5 - mt) / .7 * 5 : 5) : 0);   // Messtaster fährt auf das Teil
        R(lc, qx + 43, prb, 8, 2, '#3e2731'); R(lc, qx + 44, prb, 6, 1, '#c07a2a'); R(lc, qx + 43, prb + 2, 1, 2, '#d8d2cc');
        R(lc, qx + 36, qy + 5, 11, 3, '#a8c0cc'); R(lc, qx + 36, qy + 5, 11, 1, '#d6f0f4'); R(lc, qx + 40, qy + 5, 2, 3, '#24182a');   // Prüfteil (Gewindeteil)
        const ang = meas ? Math.sin(time * 3) * .5 + .4 : -.8; R(lc, qx + 24 + Math.round(Math.cos(ang - 1.57) * 2), qy + 10 + Math.round(Math.sin(ang - 1.57) * 2), 1, 1, '#d0394f');   // Zeiger der Messuhr
        if (on) { for (let i = 0; i < 12; i++) { const v = Math.sin((i + time * 6) * .7) * (meas ? 2.4 : .6); R(lc, qx + 63 + i, qy + 6 + Math.round(v) - 1, 1, 1, meas ? '#9cff7a' : '#7fb4c8'); }   // Messkurve
          R(lc, qx + 63, qy + 3, meas ? 6 : 3, 1, '#d6f0f4'); L.push({ x: qx + 62, y: qy + 2, w: 14, h: 7, c: '#9ad0ff', a: .35 });
          if (mt > 4.5 && mt < 5.5) { R(lc, qx + 72, qy + 3, 3, 3, '#2f7040'); R(lc, qx + 73, qy + 4, 1, 1, '#9cff7a'); } }   // grüner Haken: Teil i. O.
        if (on) { const Wk = WORKERS.set('big', 5), sk = Wk.S; blit(lc, Wk.work[meas ? Math.floor(time * 1.4) % 4 : 0], qx + 46, BASE + 1 + Math.round(sk.h - sk.hipY - sk.thigh - sk.shin)); }   // steht direkt am Tisch   // Prüferin am Tisch
      }
      const gw = ss('gewinde'), m = ss('montage'), gl = lv('gewinde'), ml = lv('montage');
      const tapPart = (x, y, raw) => { R(lc, x - 5, y, 11, 5, '#a8c0cc'); R(lc, x - 5, y, 11, 1, '#d6f0f4'); R(lc, x + 5, y, 1, 5, '#7c818a');
        R(lc, x - 1, y, 2, 5, '#24182a'); if (!raw) for (let j = 1; j < 5; j += 2) R(lc, x - 1, y + j, 2, 1, '#4a4652'); };
      const tapAt = (hx, headB, partTop, c, broken, binX, binB, feed, hand) => { if (hand && c.swap !== undefined) c = Object.assign({}, c, { hand: 1 });   // Werkstück mit Bohrung im Schraubstock, Gewindebohrer an der Pinole
        if (c.swap !== undefined) {   // hand: Arbeiter hebt das Teil heraus und legt es in die Kiste; sonst rutscht es über eine Rutsche
          const q = c.swap, q2 = ease(Math.max(0, (q - .65) / .35)), top = partTop - 4, by = binB - 7;
          if (c.hand) { if (q < .65) { let x = hx, y = partTop;
              if (q < .35) x = hx + (binX - hx) * ease(q / .35); else { x = binX; y = partTop + (by - partTop) * ease((q - .35) / .3); }   /* gleich waagrecht nach rechts, dann legt es der Arbeiter in die Kiste */
              tapPart(Math.round(x), Math.round(y)); } }
          else if (q < .5) { const f = (q / .5) * (q / .5); tapPart(Math.round(hx + (binX - hx) * f), Math.round(partTop + (by - partTop) * f)); }
          if (q > .65) { if (feed) { const a1 = Math.min(1, q2 / .5), a2 = Math.max(0, (q2 - .5) / .5); tapPart(Math.round(feed[0] + (hx - feed[0]) * ease(a2)), Math.round(feed[1] + (partTop - feed[1]) * ease(a1)), true); }   /* erst senkrecht an der Stange herunter, dann waagrecht zum Bohrer */ else { lc.globalAlpha = q2; tapPart(hx, partTop, true); lc.globalAlpha = 1; } }                                 // neues Rohteil wird eingelegt
        } else tapPart(hx, partTop, c.dir === 1 && c.d < .15);
        if (broken) return;
        const tipY = partTop - 1 + Math.round(c.d * 5), top = tipY - 7, ph = c.dir === 0 ? 0 : Math.floor(time * 10 * c.dir);
        if (top > headB) { R(lc, hx - 2, headB, 4, top - headB, '#b5afb0'); R(lc, hx - 2, headB, 1, top - headB, '#d8d2cc'); }
        for (let j = 0; j < 8; j++) R(lc, hx - 1, top + j, 2, 1, ((j + ph) % 2 + 2) % 2 ? '#d8d2cc' : '#6b6672');   // Gewindebohrer, Rillen wandern beim Drehen
        if (c.dir === 1 && c.d > .2 && Math.random() < .4) puff(hx + 2, partTop - 1, 'chip');
      };
      const BIN = (x, b, k) => { for (let j = 0; j < (k || 0); j++) tapPart(x - 2 + (j % 2) * 4, b - 7 - Math.floor(j / 2) * 3); R(lc, x - 7, b - 8, 15, 8, '#c07a2a'); R(lc, x - 7, b - 8, 15, 1, '#e8a83a'); R(lc, x - 6, b - 5, 13, 1, '#7a4a1c'); R(lc, x - 7, b - 1, 15, 1, '#7a4a1c'); };
      const GXc = 84, MXc = 304, Tg = clock('gewinde', gw.state === 'running'), tcM = gw.state === 'running' ? tapCycle(Tg) : { d: 0, dir: 0 }; if (gw.state === 'running') { SFX.hum('drill', tcM.dir ? .55 : 0, SFX.panX(GXc)); SFX.edge('tap_rev', tcM.dir === -1, 'tapRev', { pan: SFX.panX(GXc), vol: .8 }); SFX.edge('tap_bin', tcM.swap !== undefined && tcM.swap > .9, 'binDrop', { pan: SFX.panX(GXc), vol: .8 });   /* Gewindebohrer läuft zurück; fertiges Teil fällt zu den anderen in die Kiste */   /* Gewindeschneiden hörbar, Klick am Ende, Teil fällt in die Kiste */ SFX.edge('tap_rev', tcM.dir === -1, 'servo', { pan: SFX.panX(GXc), vol: .5 }); }   /* Gewindebohrer dreht hinein und heraus */
      if (st.built && gw.state !== 'broken') {   // Bediener steht hinter der Werkbank, hebt das fertige Teil heraus und legt es in die Kiste
        const Wk = WORKERS.set('big', 1), Sk = Wk.S, reach = tcM.swap !== undefined && tcM.swap < .7;
        ART.OCC.on = true; blit(lc, reach ? Wk.reach[0] : Wk.idle[Math.floor(time * .7) % 2], GXc + 38, BASE - 12 + Math.round(Sk.h - Sk.hipY - Sk.thigh - Sk.shin), null, true); ART.OCC.on = false; }   // schaut immer zur Maschine (nach links)
      const go = blit(lc, gw.state === 'broken' ? TAP.broken : TAP.ok, GXc, BASE); put('gewinde', go);
      if (gl >= 2) { for (let i = 0; i < 16; i++) R(lc, go.x + 2 - i, go.y + 25 + Math.round(i * 1.4), 2, 1, i % 3 ? '#8f8a92' : '#4a4652'); const t2 = blit(lc, TAP2B, go.x + 17, go.y + 30);   // Rutsche in die Kiste   // zweiter Kopf am Ausleger der Säule, eigener Schraubstock auf der Werkbank
        const c2 = gw.state === 'running' ? tapCycle(Tg, 2.3) : { d: 0, dir: 0 }; SFX.edge('tap2_go', c2.dir === 1, 'tapRun', { pan: SFX.panX(t2.x), vol: .7 }); SFX.edge('tap2_rev', c2.dir === -1, 'tapRev', { pan: SFX.panX(t2.x), vol: .6 });   /* zweiter Kopf: kurze eigene Geräusche statt Dauersurren */
        tapAt(t2.x + 10, t2.y + 12, go.y + 18, c2, gw.state === 'broken', go.x - 8, BASE, gl >= 3 ? [go.x + 4, go.y + 4] : null); }
      const gBinX = gl >= 3 ? go.x + 59 : go.x + 50, gBinB = gl >= 3 ? go.y + 35 : go.y + 24;
      const GR = go.x + 92, grun = gw.state === 'running'; let GP, leftN = 0;
      if (gl < 2) GP = settle('gewinde', grun, porter(Tg, { P: TAP_P, n: 5, land: TAP_P * (.48 + .52 * .65), src: gBinX, dst: MXc - 36, rest: GR, restAct: 'idle', restFace: -1, speed: 14 }), GR);   // Träger bringt die volle Kiste zur Montage
      else {   // zwei Köpfe: der Träger leert abwechselnd die rechte und die linke Kiste, jeweils wenn sie voll ist
        const PR = porter(Tg, { P: TAP_P, n: 10, land: TAP_P * (.48 + .52 * .65), src: gBinX, dst: MXc - 36, rest: GR, restAct: 'idle', restFace: -1, speed: 14 });
        const PL = porter(Tg + 5 * TAP_P, { P: TAP_P, n: 10, land: ((TAP_P * .74 - 2.3) % TAP_P + TAP_P) % TAP_P, src: go.x - 8, dst: MXc - 36, rest: GR, restAct: 'idle', restFace: -1, speed: 14 });
        GP = settle('gewinde', grun, { stack: Math.min(6, PR.stack), w: PR.w.pose !== 'idle' ? PR.w : PL.w }, GR);
        const cg = CLK.gewinde; if (grun || cg.sl === undefined) cg.sl = Math.min(6, PL.stack); leftN = cg.sl; }
      if (gl >= 2) BIN(go.x - 8, BASE, leftN);   // linke Kiste unter der Rutsche des zweiten Kopfes
      const tc0 = tcM;
      tapAt(go.x + 33, go.y + 14, go.y + 18, tc0, gw.state === 'broken', gl >= 3 ? go.x + 59 : go.x + 50, gl >= 3 ? go.y + 35 : go.y + 24, gl >= 3 ? [go.x + 52, go.y + 14] : null, true); if (gl < 3) BIN(gBinX, gBinB, GP.stack);
      if (gw.state !== 'broken') statusLamp(go.x + 38, go.y + 7, gw.state === 'running');
      if (gl >= 3) {   // Rohteil-Magazine: Röhren mit gestapelten Rohteilen, unten rutscht bei jedem Teil eines heraus
        const mag = (x, y0, h, off) => { const n = gw.state === 'running' ? 5 - Math.floor((time + off) / 4.6) % 5 : 4;
          R(lc, x - 4, y0 - 1, 9, h + 2, '#3e2731'); lc.globalAlpha = .45; R(lc, x - 3, y0, 7, h, '#c2e2e6'); lc.globalAlpha = 1;
          for (let j = 0; j < n; j++) { R(lc, x - 2, y0 + h - 3 - j * 3, 5, 2, '#a8c0cc'); R(lc, x - 2, y0 + h - 3 - j * 3, 5, 1, '#d6f0f4'); }
          R(lc, x - 4, y0 - 2, 9, 1, '#e8a83a'); R(lc, x - 3, y0, 1, h, '#fffaf0'); };
        mag(go.x + 52, go.y - 4, 18, 0); R(lc, go.x + 40, go.y + 15, 12, 1, '#6b6672'); R(lc, go.x + 40, go.y + 16, 12, 1, '#3e2731');   // Rutsche zum Schraubstock
        if (gl >= 2) { mag(go.x + 4, go.y - 6, 10, 2.3); R(lc, go.x + 4, go.y + 4, 1, 12, '#6b6672'); }
        const fo2 = blit(lc, FEEDER, go.x + 46, go.y + 30); BIN(gBinX, gBinB, GP.stack); blit(lc, TOWERL, go.x + 62, go.y + 30); L.push({ x: go.x + 61, y: go.y + 24, w: 1, h: 1, c: gw.state === 'running' ? '#9cff7a' : '#ffd56a', fire: true }); }
      if (gw.state !== 'broken' && st.built) drawPorter(lc, GP.w, 2, time);
      lvl('gewinde', GXc, BASE); crate('gewinde', GXc, go.y);
      const mo = blit(lc, m.state === 'broken' ? ASSY.broken : ASSY.ok, MXc, BASE); put('montage', mo);
      const armC = m.state === 'broken' ? '#8f8a92' : '#e8a83a', mrun = m.state === 'running';
      const Tm = clock('montage', mrun), AF = assyCycle(Tm); CLK.montage.busy = !mrun && AF.cartX !== null;
      if (mrun) { const T15m = Tm % 15; SFX.edge('mtSet', T15m < 9 && T15m % 3 > 2.2, 'assemble', { pan: SFX.panX(MXc), vol: .9 }); SFX.edge('mtLatch', T15m > 11.6 && T15m < 12.2, 'latch', { pan: SFX.panX(MXc), vol: .9 }); }   /* Montage: Teil klickt ein, Baugruppe rastet ein */
      if (mrun) { const T15 = Tm % 15, armMv = (T15 % 3 > .9 && T15 % 3 < 3 && T15 < 9) || (T15 >= 10.5 && T15 < 11.7); SFX.hum('servo', armMv ? .2 : 0, SFX.panX(MXc)); SFX.hum('conveyor', AF.conv ? .12 : 0, SFX.panX(MXc - 40)); SFX.hum('drill', AF.screw >= 0 ? .18 : 0, SFX.panX(MXc)); SFX.edge('assy_ding', AF.glint > 0, 'ding', { pan: SFX.panX(MXc) }); }   /* Montage: Roboterarme, Band, Schrauber, fertig-Ton */   // Wagenfahrer fährt zu Ende
      const A = mrun ? AF : AF.cartX !== null ? Object.assign({ conv: null, held: null, target: AS.UP, stage: 0, screw: -1, assy: 'fix' }, { cartX: AF.cartX, walk: AF.walk, dir: AF.dir, assy: AF.assy === 'cart' ? 'cart' : 'fix' }) : { conv: null, held: null, target: AS.UP, stage: 0, screw: -1, assy: 'fix', cartX: null };
      const S0 = [mo.x + 56, mo.y + 18], fx = mo.x + AS.FIX, tbl = mo.y + 30;
      if (m.state !== 'broken') {
        R(lc, fx - 7, tbl - 2, 14, 2, '#4a4652'); R(lc, fx - 7, tbl - 2, 14, 1, '#6b6672');          // Vorrichtung
        if (A.conv) { const cy = A.conv.type === 1 ? tbl - 4 : A.conv.type === 0 ? tbl - 3 : tbl - 2;
          if (ml >= 3) { const hx = 26 + A.conv.type * 8, q = (A.conv.x - 6) / (AS.P1 - 6);   // aus dem Bunker fallen, dann zum Greifpunkt
            if (q < .45) { const f = q / .45; assyPart(lc, A.conv.type, mo.x + hx, Math.round(mo.y + 19 + (cy - mo.y - 19) * f * f), true); }
            else assyPart(lc, A.conv.type, mo.x + Math.round(hx + (AS.P1 - hx) * (q - .45) / .55), cy, true);
          } else {   // Teile kommen aus der Ausgabe-Öffnung des Teilespenders links
            const ox = mo.x + 26; R(lc, ox - 2, tbl - 9, 3, 8, '#24182a'); R(lc, ox - 3, tbl - 10, 5, 1, '#e8a83a');
            lc.save(); lc.beginPath(); lc.rect(ox, 0, 400, 400); lc.clip(); assyPart(lc, A.conv.type, mo.x + Math.round(18 + (A.conv.x - 6) / (AS.P1 - 6) * (AS.P1 - 18)), cy, true); lc.restore(); } }
          else if (ml < 3) { const ox = mo.x + 26; R(lc, ox - 2, tbl - 9, 3, 8, '#24182a'); R(lc, ox - 3, tbl - 10, 5, 1, '#e8a83a'); }
        if (A.assy === 'fix') drawAssy(lc, fx, tbl - 2, A.stage, A.glint);
      }
      if (ml >= 3 && m.state !== 'broken') {   // Kamera-Portal und Teilebunker: hinter den Roboterarmen
        for (const x of [fx - 13, fx + 12]) { R(lc, x, mo.y + 2, 2, tbl - mo.y - 2, '#4a4652'); R(lc, x, mo.y + 2, 1, tbl - mo.y - 2, '#8f8a92'); }
        R(lc, fx - 14, mo.y + 1, 28, 3, '#3e2731'); R(lc, fx - 13, mo.y + 1, 26, 2, '#e8a83a'); R(lc, fx - 13, mo.y + 1, 26, 1, '#f7d86a');
        R(lc, fx - 3, mo.y + 4, 6, 4, '#3e2731'); R(lc, fx - 2, mo.y + 5, 4, 2, '#4a4652'); R(lc, fx - 1, mo.y + 7, 2, 1, mrun && Math.sin(time * 5) > 0 ? '#ff5a4a' : '#7fb4c8');
        if (mrun) L.push({ x: fx - 4, y: mo.y + 8, w: 8, h: 1, c: '#9ad0ff', a: .5 });
        [['#a8c0cc', 0], ['#d8d2cc', 1], ['#e8a83a', 2]].forEach(([c, i]) => { const hx = mo.x + 26 + i * 8; R(lc, hx - 3, mo.y + 12, 7, 6, '#3e2731'); R(lc, hx - 2, mo.y + 12, 5, 5, '#8f8a92'); R(lc, hx - 2, mo.y + 12, 5, 1, '#d8d2cc'); R(lc, hx - 1, mo.y + 13, 3, 2, c); R(lc, hx, mo.y + 17, 1, 3, '#4a4652'); });
      }
      // kleiner Arm rechts auf eigenem Sockel: verschraubt die Mutter, kommt dem großen Arm nicht in die Quere
      if (ml >= 2) { const px = mo.x + 98; const bk = m.state === 'broken', ph = BASE - mo.y - 26;   // Sockel: Säule mit Glanzkante, Fußplatte, Kopfplatte mit Schrauben
        R(lc, px - 6, BASE - 3, 13, 3, '#3e2731'); R(lc, px - 5, BASE - 3, 11, 2, '#6b6672'); R(lc, px - 5, BASE - 3, 11, 1, '#8f8a92');
        R(lc, px - 3, mo.y + 26, 7, ph - 3, '#3e2731'); R(lc, px - 2, mo.y + 26, 5, ph - 3, bk ? '#6b6672' : '#c07a2a'); R(lc, px - 2, mo.y + 26, 1, ph - 3, bk ? '#8f8a92' : '#e8a83a'); R(lc, px + 2, mo.y + 26, 1, ph - 3, bk ? '#4a4652' : '#7a4a1c');
        for (let y = mo.y + 30; y < BASE - 6; y += 5) R(lc, px - 2, y, 5, 1, bk ? '#4a4652' : '#7a4a1c');
        R(lc, px - 5, mo.y + 23, 11, 3, '#3e2731'); R(lc, px - 4, mo.y + 23, 9, 2, '#8f8a92'); R(lc, px - 4, mo.y + 23, 9, 1, '#d8d2cc'); R(lc, px - 3, mo.y + 24, 1, 1, '#4a4652'); R(lc, px + 3, mo.y + 24, 1, 1, '#4a4652');
        const rest2 = [px - 6, mo.y + 12], s2 = A.screw, above = [fx, mo.y + 9], L2 = (a, b, q) => [Math.round(a[0] + (b[0] - a[0]) * q), Math.round(a[1] + (b[1] - a[1]) * q)];
        const sc2 = s2 < 0 ? rest2 : s2 < .25 ? L2(rest2, above, ease(s2 / .25)) : s2 < .8 ? [fx, mo.y + 9 + Math.round(Math.min(1, (s2 - .25) / .2) * 3)] : L2([fx, mo.y + 12], rest2, ease((s2 - .8) / .2));
        const t2 = robotIK(lc, [px, mo.y + 24], sc2, 10, 10, armC); if (s2 >= .25 && s2 < .8) { const sp = Math.floor(time * 16) % 2; R(lc, t2[0] - 1, t2[1] + 1, 2, 2, sp ? '#d8d2cc' : '#6b6672'); R(lc, t2[0] - 1 + sp, t2[1] + 1, 1, 1, '#fffaf0'); }   // Schrauber dreht die Mutter fest
        if (A.glint > 0 && !bk) L.push({ x: px - 1, y: mo.y + 21, w: 3, h: 1, c: '#9cff7a', fire: true }); }
      const tip = robotIK(lc, S0, [mo.x + A.target[0], mo.y + A.target[1]], 19, 18, armC);
      if (A.held !== null) { const off = [3, 11, 13][A.held], dy = (tbl - 2 - off) - (mo.y + AS.TIP[A.held] + 2), dx = fx - (mo.x + AS.FIX), b = Math.max(0, ((A.hq || 0) - .5) * 2);   /* gleitet beim Absetzen genau auf seinen Platz: kein Springen */
        assyPart(lc, A.held, Math.round(tip[0] + dx * b), Math.round(tip[1] + 2 + dy * b)); }
      if (A.assy === 'arm') drawAssy(lc, tip[0], tip[1] + 15, 3, 0);
      // Arbeiter mit Wagen holt die fertige Baugruppe ab
      if (A.cartX !== null && A.cartX < 160) {
        const cx = Math.round(mo.x + A.cartX), cb = BASE + 13;
        lc.globalAlpha = .25; R(lc, cx - 11, cb - 1, 22, 2, '#1d1826'); lc.globalAlpha = 1;                       // Schatten
        R(lc, cx - 11, cb - 10, 22, 4, '#3e2731'); R(lc, cx - 10, cb - 10, 20, 2, '#cf9a5c'); R(lc, cx - 10, cb - 10, 20, 1, '#ecc58c'); for (let x = cx - 5; x < cx + 10; x += 5) R(lc, x, cb - 10, 1, 2, '#a5703f');   // Bretter
        R(lc, cx - 10, cb - 8, 20, 2, '#6b6672'); R(lc, cx - 10, cb - 8, 20, 1, '#8f8a92');                           // Rahmen
        R(lc, cx + 9, cb - 19, 3, 11, '#3e2731'); R(lc, cx + 10, cb - 18, 1, 10, '#b5afb0'); R(lc, cx + 8, cb - 19, 5, 2, '#3e2731'); R(lc, cx + 9, cb - 19, 3, 1, '#d0394f');   // Griff
        for (const wx of [cx - 6, cx + 5]) { R(lc, wx - 2, cb - 5, 5, 5, '#24182a'); R(lc, wx - 1, cb - 4, 3, 3, '#4a4652'); R(lc, wx, cb - 3, 1, 1, '#d8d2cc'); }
        if (A.assy === 'cart') drawAssy(lc, cx, cb - 9, 3, 0);
        const Wk = WORKERS.set('big', 3), Sk = Wk.S, wx = cx + 17, dist = Math.abs(A.cartX - AS.FIX) * 1.6;
        const fr = A.walk ? Wk.walk[Math.floor(dist / 18 * 8) % 8] : Wk.work[Math.floor(time * 1.2) % 4];
        blit(lc, fr, wx, BASE + 13 + Math.round(Sk.h - Sk.hipY - Sk.thigh - Sk.shin), null, A.walk ? A.dir < 0 : true);
      }
      if (ml >= 3) { blit(lc, TOWERL, mo.x + 2, mo.y + 10); L.push({ x: mo.x + 1, y: mo.y + 4, w: 1, h: 1, c: mrun ? '#9cff7a' : '#ffd56a', fire: true });
 }
      if (m.state !== 'broken') statusLamp(mo.x + 9, mo.y + 22, mrun);
      lvl('montage', MXc, BASE); crate('montage', MXc, mo.y);
    }
    if (room === 'kraftwerk') {
      blit(lc, PIPES, 192, 110); blit(lc, EXT, 22, 129);
      const on = st.built, stg = Math.max(0, Math.min(6, st.mecha || 0));
      // Montageplatz hinten rechts: Gerüsttürme, Portalkran, Riesen-Golem
      const MX = 322, MB = FLOOR + 8;
      // Hangar-Bucht: großes Rolltor mit Rippen, Rahmen mit Warnstreifen, Andockplatte, Versorgungsleitungen von oben
      const intro = st.intro, PU = stg >= 6 && on && intro === undefined ? ART.mechaUi(time) : null;   /* Wache draußen: Zeitplan wie im Werkshof */
      const gP = PU === null ? 0 : PU >= 142 ? ease(Math.min(1, (PU - 142) / 2)) : PU < 55.5 ? 1 : PU < 58 ? 1 - ease((PU - 55.5) / 2.5) : 0;
      const gate = Math.max(gP, intro === undefined ? 0 : intro < 5.5 ? 0 : ease(Math.min(1, (intro - 5.5) / 2.5))), gEdge = Math.round(MB - 2 - (MB - 44) * gate);   /* Inbetriebnahme: Rolltor fährt hoch */
      R(lc, 262, 30, 122, MB - 32, '#2a2f3a'); for (let y = 40; y < gEdge; y += 5) { R(lc, 266, y, 118, 1, '#4a4f5c'); R(lc, 266, y + 1, 118, 1, '#353a46'); R(lc, 266, y + 3, 118, 1, '#1f2330'); }
      if (gate > 0) { for (let y = gEdge; y < MB - 2; y++) R(lc, 266, y, 118, 1, rgb(mix(k.top, k.bot, Math.min(1, (y - 40) / (MB - 40))))); if (n > .3) for (let i = 0; i < 14; i++) { const sx = 268 + (i * 37) % 114, sy = gEdge + 2 + (i * 23) % Math.max(1, MB - 6 - gEdge); if (sy < MB - 16) R(lc, sx, sy, 1, 1, '#fdf6e0'); }
        for (let x = 266; x < 384; x++) { const hh = 6 + Math.round(Math.sin(x * .09) * 3 + Math.sin(x * .23) * 2); R(lc, x, MB - 2 - hh, 1, hh, rgb(mix(k.far || k.bot, hx('#1d1826'), .45))); }
        R(lc, 266, gEdge, 118, 3, '#4a4f5c'); R(lc, 266, gEdge + 2, 118, 1, '#24182a'); SFX.hum('motor', gate < 1 ? .3 : 0, SFX.panX(322)); }
      R(lc, 262, 30, 4, MB - 32, '#3b3f4a'); R(lc, 263, 30, 1, MB - 32, '#6b6672');
      for (let x = 262; x < 384; x += 6) { R(lc, x, 34, 3, 4, '#e8a83a'); R(lc, x + 3, 34, 3, 4, '#24182a'); } R(lc, 262, 38, 122, 1, '#7c818a');
      for (const bx of [270, 376]) { const blink = on && (stg >= 6 ? true : Math.floor(time * 2 + bx) % 2 === 0); R(lc, bx - 2, 40, 5, 4, '#3e2731'); R(lc, bx - 1, 41, 3, 2, stg >= 6 ? '#9cff7a' : blink ? '#ffb04a' : '#7a4a1c'); if (on && blink) L.push({ x: bx - 1, y: 41, w: 3, h: 2, c: stg >= 6 ? '#9cff7a' : '#ffb04a', fire: true, a: .9 }); }   // Statuslichter
      R(lc, 262, MB - 2, 122, 4, '#4a4652'); R(lc, 262, MB - 2, 122, 1, '#8f8a92'); for (let x = 264; x < 384; x += 8) R(lc, x, MB, 4, 1, '#e8a83a');   // Andockplatte mit Warnstreifen
      if (intro !== undefined) [290, 308, 336, 354].forEach((lx, i) => { const lit = intro > 1.2 + i * .5; R(lc, lx - 2, 39, 5, 3, '#3e2731'); R(lc, lx - 1, 40, 3, 1, lit ? '#9cff7a' : '#2f4a2a'); if (lit) L.push({ x: lx - 1, y: 40, w: 3, h: 1, c: '#9cff7a', fire: true }); SFX.edge('in_l' + i, lit, 'lamp', { pan: SFX.panX(lx) }); });   /* Statuslampen gehen nacheinander an */
      for (const [x0, d] of [[278, 1], [366, -1]]) { R(lc, x0, MB - 3, 6 * d || 6, 1, '#e8a83a'); }
      if (stg >= 1) {   // Halteketten vom Portalkran: kräftige Glieder; beim Hochfahren werden sie hochgezogen, danach hängen nur noch die Haken oben
        const yb = stg < 6 ? 70 : intro === undefined ? 44 : Math.round(70 - 26 * ease(Math.max(0, Math.min(1, (intro - 5) / 2.2))));
        if (intro !== undefined) SFX.edge('in_chain', intro > 5.05 && intro < 7.2, 'chain');
        for (const cx of [300, 344]) { R(lc, cx - 4, 37, 9, 3, '#3b3f4a'); R(lc, cx - 4, 37, 9, 1, '#8f8a92');   // Umlenkrolle am Kran
          for (let y = 40, k2 = 0; y < yb - 3; y += 3, k2++) { if (k2 % 2 === 0) { R(lc, cx - 2, y, 5, 4, '#24182a'); R(lc, cx - 1, y, 3, 1, '#b5afb0'); R(lc, cx - 2, y + 1, 1, 2, '#8f8a92'); R(lc, cx + 2, y + 1, 1, 2, '#4a4652'); R(lc, cx - 1, y + 3, 3, 1, '#565b66'); R(lc, cx - 1, y + 1, 3, 2, '#24182a'); }
            else { R(lc, cx - 1, y - 1, 3, 5, '#24182a'); R(lc, cx, y - 1, 1, 5, '#8f8a92'); R(lc, cx + 1, y, 1, 3, '#565b66'); } }
          R(lc, cx - 2, yb - 3, 5, 3, '#c07a2a'); R(lc, cx - 2, yb - 3, 5, 1, '#f7d86a'); R(lc, cx - 1, yb, 1, 3, '#7a4a1c'); R(lc, cx - 1, yb + 2, 3, 1, '#7a4a1c'); R(lc, cx + 1, yb + 1, 1, 1, '#7a4a1c'); } }   // Lasthaken
      const PUw = stg >= 6 && on && intro === undefined ? ART.mechaUi(time) : null, qxE = (a, b, d) => a + (b - a) * Math.min(1, Math.floor(d / .3) / 20), wkE = PUw === null ? null : PUw >= 144 ? { x: qxE(MX, 440, PUw - 144), dir: 1, d: PUw - 144 } : PUw >= 49.5 && PUw < 55.5 ? { x: qxE(440, MX, PUw - 49.5), dir: -1, d: PUw - 49.5 } : null;   /* rückt nur im Schritttakt vor: der stehende Fuß gleitet nicht */
      if (wkE) { const SW = mechaSidePose({ step: Math.floor(wkE.d / .3) % 8 }, st.mechaPaint || 'stahl'), wo = blit(lc, SW, Math.round(wkE.x), MB, null, wkE.dir > 0);   /* stapft seitlich durchs Tor, hinter dem gelben Gerüst */
        SW.fire.forEach(f => L.push({ x: wkE.dir > 0 ? wo.x + SW.w + 2 - f.x - f.w : wo.x + f.x - 1, y: wo.y + f.y - 1, w: f.w, h: f.h, c: '#ffd56a', fire: true, a: .8 })); }
      blit(lc, TOWER, 268, MB); blit(lc, TOWER, 379, MB);
      const paint = st.mechaPaint || 'stahl', A = st.mechaAct, asleep = intro !== undefined && intro < 5;
      // Ausfliegen durch das offene Tor (am Ende der Inbetriebnahme und zur Wache) und Zurückkommen: abheben, dann kleiner werdend ins Freie
      const flyQ = intro !== undefined ? (intro >= 10.5 ? Math.min(1, (intro - 10.5) / 3.5) : null) : PU !== null && PU < 49.5 ? 1 : null;   /* fliegt nur bei der Inbetriebnahme hinaus */
      const qxW = (a, b, d) => a + (b - a) * Math.min(1, Math.floor(d / .3) / 20), wk = PU === null ? null : PU >= 144 ? { x: qxW(MX, 440, PU - 144), dir: 1, d: PU - 144 } : PU >= 49.5 && PU < 55.5 ? { x: qxW(440, MX, PU - 49.5), dir: -1, d: PU - 49.5 } : null;   /* gleiche Werte wie wkE oben */   /* zur Wache: stapft seitlich durchs offene Tor hinaus und wieder herein */
      const away = flyQ !== null && flyQ >= 1, fly = flyQ === null ? null : { back: 0, lift: Math.max(1, Math.pow(flyQ, 1.7) * 150) };   /* zündet sofort die Düsen und steigt hinter dem Tor auf */   /* ein echter Schritt zurück (Fuß kurz anheben, versetzt absetzen), dann senkrecht hoch */   /* erst ein Schritt zurück in die Bucht, dann senkrecht hoch: verschwindet hinter der Oberkante des Tors */
      if (wk) { const st4 = Math.floor(wk.d / .3) % 8; SFX.edge('pStepA', st4 === 0, 'mstep', { pan: SFX.panX(wk.x), vol: .5 }); SFX.edge('pStepB', st4 === 4, 'mstep', { pan: SFX.panX(wk.x), vol: .5 }); }
      if (PU !== null) SFX.edge('pArrive', PU >= 55.5 && PU < 57, 'mstep', { pan: SFX.panX(MX), vol: .5 });   /* letzter Schritt beim Ankommen, bevor er sich umdreht */
      if (intro !== undefined) SFX.edge('in_out', intro > 10.5, 'mjet');   /* Schritt zurück, dann Düsen */
      if (fly && !away) SFX.hum('jet', .3, SFX.panX(MX));
      const alive = stg >= 6 && on && !asleep, ph = time * 2.4;   // fertig: atmet, pendelt mit dem Arm, schaut sich um, hebt ab und zu die Faust
      let pose = alive ? { bob: Math.sin(ph) > .3 ? 1 : 0, head: Math.sin(time * .5) > .55 ? -1 : Math.sin(time * .5) < -.7 ? 1 : 0, swing: Math.round(Math.sin(ph - .6) * 1.4), raise: (time % 9) > 7.4 ? 1 : 0 } : stg >= 6 ? { bob: 0, head: 0, swing: 0, raise: 0, awake: false } : null, lift = 0, show = null;
      if (alive && intro !== undefined && intro >= 8) { pose.raise = 0; pose.swing = 0; pose.rR = intro < 8.4 ? 1 : 3; pose.rL = intro < 8.8 ? 0 : 3; SFX.edge('in_f1', intro > 8.4, 'mservo'); SFX.edge('in_f2', intro > 8.8, 'mservo'); SFX.edge('in_f3', intro > 9.3, 'mthud', { vol: .6 }); }   /* reckt beide Fäuste */
      if (alive && A && intro === undefined) { const u = A.t, K = 'ma' + A.id;   /* Aktion nach dem Antippen (3,2 s) */
        if (A.k === 'faust') { const up = Math.floor(u * 2.5) % 2 === 1; pose.raise = up ? 2 : 0; pose.swing = 0; SFX.edge(K + 'a', up, 'mservo', { vol: .8 }); SFX.edge(K + 'b', !up && u > .3, 'clank', { vol: .6 }); }
        else if (A.k === 'winken') { pose.rR = 3; pose.wv = Math.round(Math.sin(u * 9) * 2); pose.head = 1; SFX.edge(K + 'a', u > .05, 'mservo'); SFX.edge(K + 'b', u > .5, 'mbeep'); SFX.edge(K + 'c', u > .7, 'mbeep'); }
        else if (A.k === 'abheben') { lift = Math.round(Math.sin(Math.min(1, u / 3) * Math.PI) * 12); pose.raise = 1; SFX.edge(K + 'a', u > .02, 'mjet'); if (u < 2.9) SFX.hum('jet', .35, SFX.panX(MX)); SFX.edge(K + 'b', u > 3, 'mthud'); }
        else if (A.k === 'licht') { show = Math.floor(u * 6); pose.head = [0, -1, 0, 1][show % 4]; SFX.once(K + 'c' + show, 'mlaser', { vol: .8 });   /* Laseraugen */ }
        else if (A.k === 'klinge') { pose.blade = u < .3 ? 0 : u < 1 ? Math.round(ease((u - .3) / .7) * 4) / 4 : u < 2.4 ? 1 : u < 3 ? Math.round((1 - ease((u - 2.4) / .6)) * 4) / 4 : 0; pose.swing = 0; if (u > 1.1 && u < 2.3) pose.wv = Math.round(Math.sin((u - 1.1) * 4.5));   /* nur noch leichtes Schwenken der Klinge */ SFX.edge(K + 'a', u > .05, 'mservo'); SFX.edge(K + 'b', u > .45, 'blade'); SFX.edge(K + 'c', u > 1.15, 'whoosh', { vol: .7 }); SFX.edge(K + 'd', u > 2.45, 'mservo'); }   /* Hand fährt ein, Klinge fährt aus, Schwung, wieder ein */
        else if (A.k === 'dampf') { pose.head = Math.sin(u * 4) > 0 ? -1 : 1; SFX.edge(K + 'a', u > .02, 'hiss'); SFX.edge(K + 'b', u > 1.6, 'hiss'); }
      }
      if (fly && pose) { lift = Math.round(fly.lift); if (fly.back >= 1) { pose.raise = 1; pose.swing = 0; } }
      if (alive && !away) SFX.hum('reactor', .18, SFX.panX(MX));
      const MS = pose ? mechaFrontPose(pose, paint) : MECHA_F[stg];
      let mo = null; delete HIT.mecha;
      if (away) { /* draußen auf Wache: Hangar leer */ }
      else if (wk) { /* schon hinter dem Gerüst gezeichnet */ }
      else if (fly) { const sc2 = 1 - .06 * fly.back, w = Math.round(MS.c.width * sc2), h = Math.round(MS.c.height * sc2), x = Math.round(MX - w / 2), y = Math.round(MB - 6 * fly.back - (fly.stepUp || 0) - Math.round(fly.lift) - h);
        lc.save(); lc.beginPath(); lc.rect(262, Math.max(40, gEdge + 2), 122, H); lc.clip();   /* alles über dem aufgerollten Tor bleibt unsichtbar */
        lc.imageSmoothingEnabled = false; lc.drawImage(MS.c, x, y, w, h);
        if (fly.lift > 0) SFX.hum('jet', .4, SFX.panX(MX));   /* Düsen bis zum Schluss hörbar */
        if (fly.lift > 0) for (const bx of [25, 51]) { const fx2 = Math.round(x + bx * sc2), fy2 = y + h - 2, fl = 9 + Math.floor(Math.random() * 6); R(lc, fx2 + 1, fy2, 12, fl, '#ff5a2c'); R(lc, fx2 + 2, fy2, 10, fl - 2, '#ff7a2c'); R(lc, fx2 + 4, fy2, 6, fl - 4, '#ffd56a'); R(lc, fx2 + 6, fy2, 2, Math.max(1, fl - 6), '#fffaf0'); L.push({ x: fx2 + 1, y: fy2, w: 12, h: fl, c: '#ff9a3c', fire: true }); if (Math.random() < .5 && fy2 + fl > Math.max(40, gEdge + 2) + 4) puff(fx2 + 7, fy2 + fl, 'smoke'); }   /* Rauch kommt aus den Flammen */
        lc.restore(); }
      else if (false) { const w = 0, h = 0, x = 0, y = 0;
        lc.save();
        for (const bx of [29, 54]) { const fx2 = Math.round(x + bx * fly.s), fy2 = y + h, fw = Math.max(2, Math.round(9 * fly.s)), fl = Math.max(2, Math.round((3 + Math.random() * 4) * fly.s)); R(lc, fx2, fy2, fw, fl, '#ff7a2c'); R(lc, fx2 + 1, fy2, Math.max(1, fw - 2), Math.max(1, fl - 1), '#ffd56a'); L.push({ x: fx2, y: fy2, w: fw, h: fl, c: '#ff9a3c', fire: true, a: fly.a }); }
        lc.restore(); }
      else { mo = blit(lc, MS, MX, MB - lift); HIT.mecha = { x: mo.x, y: mo.y, w: MS.w, h: MS.h, mecha: 1 }; }
      if (mo && (lift > 0 || (A && A.k === 'abheben' && A.t < 3))) for (const fx2 of [mo.x + 1 + 25, mo.x + 1 + 51]) { const fy2 = mo.y + 1 + 98, fl = 9 + Math.floor(Math.random() * 6); R(lc, fx2, fy2, 14, 1, '#3e2731'); R(lc, fx2 + 1, fy2 + 1, 12, fl, '#ff5a2c'); R(lc, fx2 + 2, fy2 + 1, 10, fl - 2, '#ff7a2c'); R(lc, fx2 + 4, fy2 + 1, 6, fl - 4, '#ffd56a'); R(lc, fx2 + 6, fy2 + 1, 2, Math.max(1, fl - 6), '#fffaf0'); R(lc, fx2 + 3, fy2 + fl, 8, 2, '#ff7a2c'); L.push({ x: fx2 + 1, y: fy2 + 1, w: 12, h: fl, c: '#ff9a3c', fire: true }); if (Math.random() < .6) puff(fx2 + 7, MB - 2, 'smoke'); }   /* große Düsenflammen unter beiden Stiefeln */   /* Düsen unter den Stiefelsohlen */   /* Düsenflammen unter den Füßen */
      if (show !== null && mo) { const SC = ['#ff5a4a', '#ffd56a', '#9cff7a', '#7fd4ff', '#d07aff', '#ffffff'], c = SC[show % SC.length], hx2 = mo.x + 1 + 45 + pose.head, ey = mo.y + 1 + 28 + pose.bob, cy2 = mo.y + 1 + 46 + pose.bob;   /* Lichtshow: Augen und Kern wechseln die Farbe, Strahlen fegen durch die Halle */
        for (const ex of [hx2 - 4, hx2 + 3]) { R(lc, ex, ey, 2, 1, c); L.push({ x: ex, y: ey, w: 2, h: 1, c, fire: true }); }
        R(lc, mo.x + 44, cy2 - 1, 3, 3, c); L.push({ x: mo.x + 43, y: cy2 - 2, w: 5, h: 5, c, fire: true });
        lc.globalAlpha = .28; for (const [ex, d] of [[hx2 - 4, -1], [hx2 + 4, 1]]) { const tx2 = MX + d * (30 + Math.sin(A.t * 5) * 70); seg(lc, ex, ey, Math.round(tx2), BASE + 10, c, 1); seg(lc, ex, ey + 1, Math.round(tx2) + d * 2, BASE + 10, c, 1); } lc.globalAlpha = 1; }
      if (mo && A && A.k === 'dampf' && A.t < 3) { if (Math.random() < .45) puff(mo.x + 40 + Math.random() * 12, mo.y + 12 + Math.random() * 4, 'smoke'); if (Math.random() < .6) puff(mo.x + (Math.random() < .5 ? 8 : 72) + Math.random() * 10, mo.y + 54 + Math.random() * 12, 'smoke'); }   /* Dampf aus Kopf und Armen */
      if (intro !== undefined && stg >= 6 && mo) {   /* Energiekern lädt auf, dann gehen die Augen an */
        const q = Math.max(0, Math.min(1, (intro - 2.8) / 2.2)); if (q > 0 && intro < 5) { L.push({ x: mo.x + 40, y: mo.y + 42, w: 10, h: 10, c: '#ffd56a', fire: true, a: q }); if (Math.random() < q * .5) puff(mo.x + 45 + (Math.random() - .5) * 20, mo.y + 46, 'spark'); }
        SFX.edge('in_pw', intro > 2.8, 'mpower'); SFX.edge('in_on', intro > 5, 'mzap'); SFX.edge('in_hs', intro > 5.1, 'hiss');
        if (intro > 5 && intro < 6) for (let i = 0; i < 3; i++) puff(mo.x + 15 + Math.random() * 60, mo.y + 20 + Math.random() * 30, 'smoke'); }

      if (alive && mo) { const pulse = .6 + .4 * Math.sin(time * 3); MS.fire.forEach(f => L.push({ x: mo.x + f.x - 1, y: mo.y + f.y - 1, w: f.w, h: f.h, c: f.h > 2 ? '#ff7a2c' : '#ffd56a', fire: true, a: pulse }));
        if (Math.random() < dt * 2.5) puff(mo.x + 38 + Math.random() * 14, mo.y + 11 + pose.bob, 'smoke'); if (Math.random() < dt * .12) SFX.play('hiss', { vol: .3, gap: 5, pan: SFX.panX(MX) }); }
      if (stg < 6) { blit(lc, PLAT_L, 279, 106); blit(lc, PLAT_R, 371, 74); }   // fertig: Arbeitsbühnen sind abgebaut
      blit(lc, GANTRY, 322, 34);
      if (stg >= 6 && st.mechaName) {   /* Namensschild hängt über dem Hangar */
        lc.font = '8px "Pixelify Sans", monospace'; const nm = st.mechaName, tw = Math.ceil(lc.measureText(nm).width), px0 = 323 - Math.round((tw + 10) / 2), py0 = 12;
        R(lc, px0 + 3, 4, 1, py0 - 4, '#3e2731'); R(lc, px0 + tw + 6, 4, 1, py0 - 4, '#3e2731');
        R(lc, px0 - 1, py0 - 1, tw + 12, 12, '#24182a'); R(lc, px0, py0, tw + 10, 10, '#c07a2a'); R(lc, px0, py0, tw + 10, 1, '#f7d86a'); R(lc, px0, py0 + 9, tw + 10, 1, '#7a4a1c'); R(lc, px0 + 2, py0 + 2, 1, 1, '#7a4a1c'); R(lc, px0 + tw + 7, py0 + 2, 1, 1, '#7a4a1c');
        lc.fillStyle = '#2a1a10'; lc.textAlign = 'left'; lc.textBaseline = 'alphabetic'; lc.fillText(nm, px0 + 5, py0 + 8); }
      // Kran: Laufkatze fährt langsam hin und her und hebt ein Panzerteil (solange noch gebaut wird)
      const gp = (Math.sin(time * .12) + 1) / 2, tx = stg >= 6 ? 370 : Math.round(296 + gp * 56), hookY = stg >= 6 ? 44 : Math.round(44 + (1 - Math.abs(Math.sin(time * .12 + 1))) * 10);   /* mit Bauteil höher, damit es über dem Mecha schwebt */   // fertig: Haken oben geparkt
      R(lc, tx - 5, 34, 11, 4, '#3b3f4a'); R(lc, tx - 5, 34, 11, 1, '#7c818a'); R(lc, tx - 1, 38, 1, hookY - 38, '#3e2731'); R(lc, tx + 1, 38, 1, hookY - 38, '#3e2731'); R(lc, tx - 2, hookY, 5, 3, '#e8a83a');
      if (stg < 6) { const NP = MNEXT[stg], pt = hookY + 6; seg(lc, tx, hookY + 3, tx - Math.min(10, NP.w / 2 - 2), pt, '#3e2731', 1); seg(lc, tx, hookY + 3, tx + Math.min(10, NP.w / 2 - 2), pt, '#3e2731', 1); blit(lc, NP, tx, pt + NP.h - 1); }   /* am Haken hängt das nächste Bauteil */
      // Arbeiter auf dem Gerüst: schweißen und schrauben, mit Funken
      if (on && stg < 6) { SFX.hum('weld', .1, SFX.panX(300)); SFX.hum('motor', .1 * Math.abs(Math.cos(time * .12)), SFX.panX(tx));   /* Schweißen und Kran beim Bau */
        const Wa = WORKERS.set('big', 4), Wb = WORKERS.set('big', 0);
        WORKERS.put(lc, Wa.reach[Math.floor(time * 2) % 2], 282, 99, false); WORKERS.put(lc, Wb.reach[Math.floor(time * 1.5 + 1) % 2], 366, 67, true);
        if (Math.random() < .5) puff(291 + Math.random() * 2, 84 + Math.random() * 3, 'spark'); if (Math.random() < .3) puff(355, 52 + Math.random() * 3, 'spark');
        L.push({ x: 290, y: 84, w: 2, h: 2, c: '#9ad0ff', fire: true, a: Math.random() < .6 ? 1 : .3 });
      }
      // Energiekapseln, Kabel zur Turbine und zum Golem
      {   // dickes Versorgungskabel: hinter den Energiekapseln entlang, mit Stichleitungen in jede Kapsel, dann über den Boden nach hinten zum Hangar
        const cab = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); R(lc, x, y - 1, 1, 4, '#24182a'); R(lc, x, y, 1, 2, '#3b3f4a'); R(lc, x, y, 1, 1, '#6b6672'); } };
        cab(194, BASE - 4, 258, BASE - 4);
        for (const cx of [206, 224, 242]) { R(lc, cx - 1, BASE - 8, 3, 4, '#24182a'); R(lc, cx, BASE - 8, 1, 4, '#565b66'); }
        cab(258, BASE - 4, 300, MB + 2);
        R(lc, 298, MB - 1, 6, 5, '#3e2731'); R(lc, 299, MB, 4, 3, '#e8a83a'); R(lc, 299, MB, 4, 1, '#f7d86a');   // Stecker am Hangar
        R(lc, 191, BASE - 6, 4, 5, '#3e2731'); R(lc, 192, BASE - 5, 2, 3, '#6b6672');   // Kabelende links mit Muffe
      }
      CAPS.forEach((c, i) => { const o2 = blit(lc, c, 206 + i * 18, BASE); if (on) { const a = .45 + .35 * Math.sin(time * 1.8 + i * 2.1); L.push({ x: o2.x + 4, y: o2.y + 8, w: 8, h: 18, c: CAPC[i], fire: true, a }); const by = o2.y + 26 - ((time * 9 + i * 7) % 18); R(lc, o2.x + 7 + (i % 2) * 2, Math.round(by), 1, 1, '#fffaf0'); } });
      const o = blit(lc, on ? TURB.ok : TURB.broken, 112, BASE); HIT.turbine = { x: o.x, y: o.y, w: 150, h: 56, info: 1 }; if (on) SFX.hum('turbine', .3, SFX.panX(112));   /* Turbine brummt */
      blit(lc, FLY[on ? Math.floor(time * 6) % 4 : 0], o.x + 92, o.y + 20);
      if (on) { L.push({ x: o.x + 120, y: o.y + 26, w: 14, h: 4, c: '#ffd56a', fire: true }); if (Math.random() < dt * 3) puff(o.x + 141, o.y - 1, 'smoke'); }
    }
    // gekaufte Einrichtung: Wand (y = 1) und Boden (y = 0)
    const pl = window.DBG_PLACED || st.placed || {}, WL = WALL[room], FREE = [], FRONT = [];   // Bodenteile stehen vorne: Arbeiter laufen dahinter vorbei
    WL.xs.forEach((x, i) => { const it = pl['1:' + i], wy = WL.ys ? WL.ys[i] : WL.y; HIT['wall' + i] = { x: x - 12, y: wy - 20, w: 24, h: 20, slot: i, lvl: 1, item: it };
      if (it && DSI[it]) { const o = blit(lc, DSI[it], x, wy); if (it === 'leuchtschild' && st.built) DSI[it].fire.forEach(f => L.push({ x: o.x + f.x - 1, y: o.y + f.y - 1, w: f.w, h: f.h, c: f.h > 2 ? '#ff9a3c' : '#ffd56a', fire: true, a: .55 })); }
      else if (st.showSlots === 'wand') FREE.push({ wall: 1, x: x - 12, y: wy - 21, w: 24, h: 22 }); });
    RM.slots.forEach((x, i) => { const it = pl['0:' + i]; const b = BASE + 18; HIT['slot' + i] = { x: x - 12, y: b - 22, w: 24, h: 23, slot: i, lvl: 0, item: it };
      if (it && DSI[it]) FRONT.push(() => blit(lc, DSI[it], x, b)); else if (st.showSlots === 'boden' && (!st.only || st.only === room)) FREE.push({ x, b, w: 22 }); });
    LATE.forEach(f => f()); LATE.length = 0;
    // Arbeiter: gehen in Ruhe zwischen Maschinen, Lager und Werkbank
    const nRun = Object.values(st.s || {}).filter(x => x.state === 'running').length;
    const nWork = !st.built ? 0 : room === 'pfoertner' ? Math.min(2, Math.max(1, nRun)) : 1;   // Träger und Wagenfahrer kommen dazu
    const roomRun = Object.keys(RM.stations).some(id => ss(id).state === 'running');
    const FUN = ['phone', 'coffee', 'stretch', 'idle', 'wave'];   // Maschinen aus: die Leute machen Pause
    const spots = roomRun ? RM.walk : RM.walk.map((p, i) => ({ x: p.x, face: p.face, act: FUN[(i + Math.floor(time / 25)) % FUN.length] })).concat(room === 'blechwerkstatt' ? [{ x: 62, act: 'coffee', face: -1 }] : []);
    if (nWork) { const c = WORKERS.crew('in_' + room, nWork, spots, 'big', 10, 374, room === 'pfoertner' ? 99 : undefined); WORKERS.step(c, dt); WORKERS.draw(lc, c, BASE + 13, time); }
    ART.OCC.on = true; FRONT.forEach(f => f()); ART.OCC.on = false;
    if (st.owned && st.owned.katze) { const cs = CATS[room] || (CATS[room] = {}), c = ART.catStep(cs, dt, time, 24, 360, 11, 1); ART.OCC.on = true; const o = blit(lc, c.fr, c.x, BASE + 22, null, c.flip); ART.OCC.on = false; HIT.fx_katze = { x: o.x, y: o.y, w: o.s.w, h: o.s.h, fixed: 'katze' };   // Katzenroboter streift durch die Halle
      L.push({ x: o.x + (c.flip ? c.fr.w - 1 - c.fr.eye.x : c.fr.eye.x), y: o.y + c.fr.eye.y, w: 1, h: 1, c: '#7fe0ff', fire: true, a: .6 }); }
    if (room === 'kraftwerk' && st.intro !== undefined) { const u = st.intro, dk = u < 1 ? u * .7 : u < 5 ? .7 : u < 6.5 ? .7 * (1 - (u - 5) / 1.5) : 0; if (dk > 0) { lc.globalAlpha = dk; R(lc, 0, 0, W, H, '#05060f'); lc.globalAlpha = 1; } DIM = dk; } else DIM = 0;   /* Halle wird für den Start dunkel */
    tint(lc, W, H, k.tint);
    if (!st.built) { lc.globalCompositeOperation = 'source-atop'; lc.fillStyle = 'rgba(40,30,50,.35)'; lc.fillRect(0, 0, W, H); lc.globalCompositeOperation = 'source-over'; }
    sc.drawImage(layer, 0, 0);
    if (n > .3 && !lampsOn) { sc.globalAlpha = (n - .3) * .6; R(sc, 0, 0, W, H, '#0b1030'); sc.globalAlpha = 1; }
    stepParts(dt);
    const smc = rgb(mix(hx('#d6d6de'), k.bot, .35));
    for (const p of parts) { const a = Math.max(0, p.life / p.max); sc.globalAlpha = p.kind === 'smoke' ? a * .5 : .95; R(sc, p.x, p.y, p.sz, p.sz, p.kind === 'smoke' ? smc : p.c); }
    sc.globalAlpha = 1;
    for (const u of UP) upCone(sc, u, n, time);
    for (const l of L) if (l.cone && n > .15) softCone(sc, l, n, time);
    ART.glowPass(sc, L, l => Math.max(.35, n, DIM) * (l.a === undefined ? 1 : l.a)); ART.OCC.list.length = 0;
    if (n < .4) { sc.globalAlpha = .06 * (1 - n * 2); for (const w of wall.wins) for (let i = 0; i < 50; i++) R(sc, w.x + 6 + i * .5, w.y + w.h + i, w.w - 8, 1, '#fff3c0'); sc.globalAlpha = 1; }
    ctx.drawImage(scene, 0, 0);
    if (st.showSlots) { OVER.dim(ctx, W, H); FREE.forEach((f, i) => f.wall ? OVER.frame(ctx, f.x, f.y, f.w, f.h, time, i) : OVER.spot(ctx, f.x, f.b, f.w, time, i)); }
    if (st.sel && HIT[st.sel]) { const h = HIT[st.sel], q = h.pad || 0; OVER.box(ctx, h.x - 2 - q, h.y - 2 - q, h.x + h.w + 1 + q, h.y + h.h + 1 + q, Math.sin(time * 5) > -.3 ? '#ffffff' : '#ffe08a'); }
    if (st.keysNew && HIT.schluessel) { const h = HIT.schluessel; OVER.bubble(ctx, h.x + h.w / 2, h.y - 2 + Math.round(Math.sin(time * 3)), '#d0394f'); }   /* neuer Schlüssel am Brett */
    Object.keys(RM.stations).forEach(id => { const h = HIT[id]; if (h && st.marks && st.marks[id] === 'repair') OVER.bubble(ctx, h.x + h.w / 2, h.y - 2 + Math.round(Math.sin(time * 3 + h.x)), '#d0394f'); });
  }
  // Strahler von unten: warmer Kegel nach oben, schräg zur Tafelmitte
  function upCone(g, u, n, time) {
    const k = (.55 + .45 * n) * (.95 + .05 * Math.sin(time * 2 + u.x));
    g.globalCompositeOperation = 'lighter';
    for (let i = 1; i < u.len; i++) {
      const t = i / u.len, fall = Math.pow(1 - t, 1.1), w = u.w + i * .55, cx = u.x + 1 + u.dir * i * .3;
      [[1, .05], [.6, .06], [.3, .08]].forEach(([f, a]) => { g.globalAlpha = a * fall * k; const ww = Math.max(1, Math.round(w * f)); R(g, Math.round(cx - ww / 2), u.y - i, ww, 1, '#ffcf8a'); });
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  // weicher Lichtkegel: nach unten und zu den Rändern ausgeblendet, leicht flackernd
  function softCone(g, l, n, time) {
    const len = l.len || 74, cx = l.x + l.w / 2, flick = .93 + .07 * Math.sin(time * 7 + l.x) * Math.sin(time * 3.1 + l.x * .3);
    const k = Math.min(1, (n - .15) / .5) * flick;
    for (let i = 1; i < len; i++) {
      const t = i / len, fall = Math.pow(1 - t, 1.7), w = l.w + i * 1.15;
      [[1, .045], [.68, .05], [.38, .06]].forEach(([f, a]) => { g.globalAlpha = a * fall * k; const ww = Math.max(1, Math.round(w * f)); R(g, Math.round(cx - ww / 2), l.y + 1 + i, ww, 1, l.c); });
    }
    g.globalAlpha = 1;
  }

  // Arbeiter (groß) und Katzenroboter (groß)
  const WORKER = ['.....EEEEEE.....', '....EFFFFFEE....', '...EFFEEEEEED...', '...DDDDDDDDDDD..', '.....RRRRRS.....', '.....RaRRaS.....', '.....RRRRRS.....', '......RRSS......', '.......SS.......', '....zzzzzzzzy...', '...zAAzzzzzzzy..', '..zAzzzzEzzzzzy.', '..zAzzzzzzzzzzy.', '..zzzzzzzzzzzzy.', '..RzzzzzzzzzzyR.', '..RRzzzzzzzzyRR.', '...R.zzzzzzzy.R.', '.....yyyyyyyy...', '.....zzzzzzzy...', '.....zzzz.zzzy..', '.....zzzz.zzzy..', '.....zzzz.zzzy..', '.....zzzz.zzzy..', '.....zzzz.zzzy..', '.....yyyy.yyyy..', '....aaaaa.aaaaa.'];
  const WORKER2 = WORKER.slice(); WORKER2[19] = '.....zzzz..zzzy.'; WORKER2[20] = '....zzzz...zzzy.'; WORKER2[21] = '....zzzz....zzzy'; WORKER2[22] = '...zzzz.....zzzy'; WORKER2[23] = '...zzzz.....zzzy'; WORKER2[24] = '...yyyy.....yyyy'; WORKER2[25] = '..aaaaa....aaaaa';
  const WK = [S(WORKER), S(WORKER2)];
  const CATS = {};
  const CATBIG = S(['jj.....jj....', 'jij...jij....', 'jjjjjjjjj....', 'jAjjjjAjj...j', 'jjjjhjjjj..j.', '.jjjjjjjjjjj.', '.jjjjjjjjjjj.', '.jj.jj..jj.jj', '.hh.hh..hh.hh']);

  return { gim: (name, o) => { GIM[name] = Object.assign({}, o || {}); }, MNEXT, draw, HIT, ROOMS, FLOOR, DSI, MECHA_STAGES, MECHA, mechaPose, MECHA_F, mechaFrontPose, mechaSidePose, SPOT };
})();
