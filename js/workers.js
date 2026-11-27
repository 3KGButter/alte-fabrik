// Arbeiterinnen und Arbeiter: Figuren aus einem kleinen Skelett (Hüfte, Knie, Fuß, Schulter, Ellbogen, Hand)
// Gehzyklus mit 8 Bildern, Kopfnicken durch das Standbein, Armschwung gegengleich, Fußbild an die Strecke gekoppelt (kein Rutschen).
'use strict';
const WORKERS = (() => {
  const { Grid, buildSprite } = ART;
  // Farbvarianten: Helm hell/dunkel, Haut, Jacke hell/mittel/dunkel, Hose, Hose dunkel, Haare
  const VAR = [
    { h1: 'F', h2: 'E', s1: 'R', s2: 'S', j1: 'A', j2: 'z', j3: 'y', p1: 'x', p2: 'U', hair: 'b' },
    { h1: 'l', h2: 'j', s1: 'd', s2: 'c', j1: 'Q', j2: 'P', j3: 'O', p1: 'g', p2: 'a', hair: 'a' },
    { h1: 'v', h2: 'u', s1: 'R', s2: 'S', j1: 'j', j2: 'i', j3: 'h', p1: 'x', p2: 'U', hair: 'C' },
    { h1: 'F', h2: 'E', s1: 'c', s2: 'b', j1: 'v', j2: 'u', j3: 't', p1: 'h', p2: 'g', hair: 'a' },
    { h1: 'l', h2: 'j', s1: 'R', s2: 'S', j1: 'f', j2: 'e', j3: 'd', p1: 'o', p2: 'n', hair: 'e' }
  ];
  const PORTER = { h1: 'x', h2: 'U', cap: 1, s1: 'R', s2: 'S', j1: 'y', j2: 'x', j3: 'U', p1: 'T', p2: 'U', hair: 'b' };   // Pförtner: dunkelblaue Uniform, Schirmmütze
  [{ bib: 1 }, {}, {}, { bib: 1 }, {}].forEach((x, i) => Object.assign(VAR[i], x));   // v147: Latzhose für Abwechslung; v150: Farben wie die Figuren innen (figpx.js)
  const MEISTER = { flat: 1, h1: 'z', h2: 'y', h3: 'x', s1: 'R', s2: 'S', j1: 'E', j2: 'D', j3: 'C', p1: 'T', p2: 'g', hair: 'j', beard: 1 };   // Werkmeister
  const vOf = vi => vi === 99 ? PORTER : vi === 98 ? MEISTER : VAR[vi % VAR.length];
  const BIG = { big: 1 };   // nur noch Kennzeichen; Maße der großen Figuren in make()
  const SMALL = { w: 9, h: 14, hipY: 8, hipX: 3, thigh: 2.6, shin: 2.6, shY: 4.6, shX: 3, ua: 2, fa: 2, th: 1, boot: 2 };

  function line(g, x0, y0, x1, y1, c, th) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); for (let k = 0; k < th; k++) g.set(x + k, y, c); }
  }
  // pose: dy, legs [{a, b}] (Oberschenkelwinkel, Kniebeuge), arms [{a, b}], carry
  // v150: eigener Takt je Figur (Phase und Tempo zufällig), damit zwei an derselben Arbeit nicht gleich wackeln
  const tak = a => a._tak || (a._tak = { ph: Math.random() * 10, sp: .82 + Math.random() * .36 });
  // kleine Figuren (draußen); die großen innen kommen aus figpx.js
  function render(S, v, pose) {
    const g = Grid(S.w, S.h), dy = pose.dy || 0;
    const hip = [S.hipX, S.hipY + dy], sh = [S.shX, S.shY + dy];
    const leg = (L, far) => {
      const kx = hip[0] + Math.sin(L.a) * S.thigh, ky = hip[1] + Math.cos(L.a) * S.thigh, f = L.a - L.b;
      const fx = kx + Math.sin(f) * S.shin, fy = ky + Math.cos(f) * S.shin;
      const c = far ? v.p2 : v.p1;
      line(g, hip[0], hip[1], kx, ky, c, S.th); line(g, kx, ky, fx, fy, c, S.th);
      const bx = Math.round(fx), by = Math.round(fy);
      for (let i = 0; i < S.boot; i++) g.set(bx + i, by, 'a');
    };
    const arm = (A, far) => {
      const ex = sh[0] + Math.sin(A.a) * S.ua, ey = sh[1] + Math.cos(A.a) * S.ua, f = A.a + A.b;
      const hx = ex + Math.sin(f) * S.fa, hy = ey + Math.cos(f) * S.fa;
      line(g, sh[0], sh[1], ex, ey, far ? v.p2 : v.j3, S.th); line(g, ex, ey, hx, hy, far ? v.p2 : v.j3, S.th);
      const x = Math.round(hx), y = Math.round(hy);
      g.set(x, y, far ? v.s2 : v.s1);
      if (!far && pose.phone) { g.set(x + 1, y - 1, 'U'); g.set(x + 1, y, 'B'); }
      if (!far && pose.cup) { g.set(x + 1, y - 1, 'J'); g.set(x + 1, y, 'J'); }
    };
    // hinten: fernes Bein und ferner Arm
    leg(pose.legs[1], true); if (!pose.carry) arm(pose.arms[1], true);
    // Rumpf
    {
      for (let y = 4; y <= 7; y++) for (let x = 2; x <= 4; x++) g.set(x, y + dy, x === 2 ? v.j1 : x === 4 ? v.j3 : v.j2);
      for (let x = 2; x <= 4; x++) g.set(x, 8 + dy, v.p2);
      g.set(2, 2 + dy, v.hair); g.set(3, 2 + dy, v.s1); g.set(4, 2 + dy, v.s1); g.set(3, 3 + dy, v.s2); g.set(4, 3 + dy, v.s1);
      g.set(2, dy, v.h1); g.set(3, dy, v.h1); g.set(4, dy, v.h2);
      for (let x = 1; x <= 5; x++) g.set(x, 1 + dy, x <= 2 ? v.h1 : v.h2);
    }
    leg(pose.legs[0], false);
    if (pose.carry) {
      // Kiste vor der Brust, beide Hände darunter
      const bx = 5, by = 4 + dy, bw = 3, bh = 3;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) g.set(bx + x, by + y, (y === 0 || x === 0) ? 'e' : (y === bh - 1 || x === bw - 1) ? 'c' : 'd');
      g.set(bx, by + bh, v.s1);
      line(g, sh[0], sh[1], bx, by + bh - 1, v.j2, S.th);
    } else arm(pose.arms[0], false);
    return buildSprite(g.rows());
  }

  // Gehzyklus: Standbein gestreckt bestimmt die Höhe (natürliches Wippen)
  function walkPose(i, n, S, carry) {
    const p = i / n * Math.PI * 2, A = .5;
    const legs = [0, 1].map(k => { const s = k ? -1 : 1, a = s * A * Math.sin(p), sw = Math.max(0, s * Math.cos(p)); return { a, b: .95 * sw }; });
    const stance = legs.reduce((m, l) => l.b < m.b ? l : m);
    const len = S.thigh + S.shin, dy = Math.round(len - len * Math.cos(stance.a)) + (Math.abs(Math.sin(p)) < .4 ? 0 : 0);
    const arms = [0, 1].map(k => { const s = k ? 1 : -1, a = s * .5 * Math.sin(p); return { a, b: .25 + Math.max(0, a) * .6 }; });
    return { dy, legs, arms, carry };
  }
  // v150: große Figuren innen kommen fertig aus figpx.js (Pixelfiguren); hier nur noch Farbe/Name je Figur
  VAR.forEach((v, i) => { v.px = 'v' + i; }); PORTER.px = 'por'; MEISTER.px = 'mei';
  // von vorn oder hinten: k 0..5 Gehbild, k >= 6 stehen; v.blink: Augen zu
  function chFront(v, back, k) { const P = FIGPX.sprites(v.px); return k < 6 ? (back ? P.back : P.front)[k] : back ? P.bidle[0] : P.fidle[v.blink ? 2 : 0]; }
  /* HOF-KERN v159: kleine Menschen im Werkshof (9 x 14), mit pxl entworfen (tools/hof/hof.px.js). Quelle: tools/hof/kern.js
     Liefert Schlüssel-Zeilen in der Spielpalette; den weichen Umriss setzt buildSprite dazu.
     HOFFIG.bilder(vi) -> { walk, carry, idle, work, hammer, sit, phone, coffee, stretch, wave, vorn, hinten, sitzvorn }  */
  const HOFFIG = (() => {
    // Fünf Menschen plus Nachtwächter (5), Angler (6) und Ruderer (7)
    const VS = [
      { h1: 'F', h2: 'E', h3: 'D', hat: 'helm', s1: 'R', s2: 'S', hair: 'b', j1: 'A', j2: 'z', j3: 'y', p1: 'x', p2: 'U', boot: 'a', bib: 1 },
      { h1: 'l', h2: 'j', h3: 'i', hat: 'helm', s1: 'e', s2: 'd', hair: 'E', zopf: 1, j1: 'Q', j2: 'P', j3: 'O', p1: 'g', p2: 'a', boot: 'a', klein: 1 },
      { h1: 'v', h2: 'u', h3: 't', hat: 'muetze', s1: 'R', s2: 'S', hair: 'C', bart: 1, j1: 'j', j2: 'i', j3: 'h', p1: 'x', p2: 'U', boot: 'b' },
      { h1: 'F', h2: 'E', h3: 'D', hat: 'helm', s1: 'c', s2: 'b', hair: 'a', j1: 'v', j2: 'u', j3: 't', p1: 'h', p2: 'g', boot: 'a', bib: 1 },
      { h1: 'z', h2: 'y', h3: 'x', hat: 'kappe', s1: 'e', s2: 'd', hair: 'i', schnauz: 1, j1: 'f', j2: 'e', j3: 'd', p1: 'o', p2: 'n', boot: 'b' },
      { h1: 'y', h2: 'x', h3: 'U', hat: 'kappe', s1: 'R', s2: 'S', hair: 'h', schnauz: 1, j1: 'y', j2: 'x', j3: 'U', p1: 'T', p2: 'U', boot: 'a', mantel: 1 },   // Nachtwächter: Schirmmütze, langer dunkelblauer Mantel
      { h1: 'o', h2: 'n', h3: 'm', hat: 'kappe', s1: 'R', s2: 'S', hair: 'j', bart: 1, j1: 'p', j2: 'o', j3: 'n', p1: 'T', p2: 'U', boot: 'b' },                  // Angler: grüner Hut, Weste, grauer Bart
      { h1: 'v', h2: 'u', h3: 't', hat: 'muetze', s1: 'R', s2: 'S', hair: 'b', j1: 'F', j2: 'E', j3: 'D', p1: 'x', p2: 'U', boot: 'a' } ];                      // Ruderer: rote Mütze, gelbes Ölzeug
    // 9 x 16: zwei leere Zeilen über dem Kopf für erhobene Arme; gezeichnet wird in Koordinaten 0..13 (Boden 13), set verschiebt um 2
    function Fig(W, H) { const b = Array.from({ length: H }, () => Array(W).fill(null)), o = { W, H, b };
      o.set = (x, y, k) => { x = Math.round(x); y = Math.round(y) + 2; if (k && x >= 0 && y >= 0 && x < W && y < H) b[y][x] = k; };
      o.line = (x0, y0, x1, y1, k) => { const n = Math.max(Math.abs(Math.round(x1) - Math.round(x0)), Math.abs(Math.round(y1) - Math.round(y0)), 1); for (let i = 0; i <= n; i++) o.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, k); };
      o.rows = () => b.map(r => r.map(k => k || '.').join(''));
      return o; }
    const HAT = { helm: [[3, 0, 'h1'], [4, 0, 'h1'], [5, 0, 'h2'], [2, 1, 'h2'], [3, 1, 'h1'], [4, 1, 'h1'], [5, 1, 'h1'], [6, 1, 'h2'], [2, 2, 'h2'], [3, 2, 'h2'], [4, 2, 'h2'], [5, 2, 'h2'], [6, 2, 'h2'], [7, 2, 'h3']],
      muetze: [[3, 0, 'h3'], [3, 1, 'h1'], [4, 1, 'h1'], [5, 1, 'h2'], [2, 2, 'h3'], [3, 2, 'h2'], [4, 2, 'h2'], [5, 2, 'h2']],
      kappe: [[3, 1, 'h1'], [4, 1, 'h1'], [5, 1, 'h2'], [2, 2, 'h2'], [3, 2, 'h2'], [4, 2, 'h2'], [5, 2, 'h2'], [6, 2, 'h3'], [7, 2, 'h3']] };

    // ---- Seitenansicht (schaut nach rechts). q: bob, nf/ff [vor, Höhe], na/fa Hand [dx, dy] ab Schulter, carry, sit, ding ('phone' | 'cup' | 'hammer'), lean
    function side(v, q) {
      const g = Fig(9, 16), B = (q.bob || 0) + (q.sit ? 2 : 0), hx = 3.5, hipY = 9 + B, kl = v.klein ? 1 : 0
      const leg = (F, k) => { if (q.sit) { g.line(hx, hipY, hx + 2.5, hipY, k); g.line(hx + 2.5, hipY, hx + 2.5, 12, k); g.set(hx + 2.5, 13, v.boot); g.set(hx + 3.5, 13, v.boot); return; }
        const fx = Math.round(hx + F[0]), fy = 12 - (F[1] || 0), kx = hx + (F[0] + (F[1] ? 1.5 : 0)) * .5, ky = hipY + 1.6 - (F[1] ? .6 : 0);
        g.line(hx, hipY, kx, ky, k); g.line(kx, ky, fx, fy, k); g.set(fx, fy + 1, v.boot); g.set(fx + 1, fy + 1, v.boot); };
      const sx = 3.5 + (q.lean || 0), sy = 5.5 + B + kl * .6
      const arm = (A, k) => { const wx = sx + A[0], wy = sy + 3 + (A[1] || 0), ex = (sx + wx) / 2 + (A[1] < -2 ? -.5 : 0), ey = (sy + wy) / 2 + (A[1] < -2 ? 0 : .3);
        g.line(sx, sy, ex, ey, k); g.line(ex, ey, wx, wy - (wy > sy ? 1 : -1), k); g.set(wx, wy, v.s1); return [Math.round(wx), Math.round(wy)]; };
      if (!q.carry) arm(q.fa || [-.3, 0], v.p2);
      leg(q.ff || [-.5, 0], v.p2);
      const L = q.lean || 0
      for (let y = 5 + kl; y <= 8; y++) for (let x = 2; x <= 5; x++) g.set(x + (y < 7 ? L : 0), y + B, y === 8 ? (x === 2 || x === 5 ? v.p2 : v.p1) : x === 2 ? v.j1 : x === 3 ? v.j2 : v.j3);
      if (v.mantel && !q.sit) for (let x = 2; x <= 5; x++) { g.set(x, 8 + B, x === 2 ? v.j1 : v.j2); g.set(x, 9 + B, x === 2 ? v.j2 : v.j3); }   // Mantel bis übers Knie
      if (v.bib) { g.set(4, 6 + B, v.p1); g.set(4, 7 + B, v.p1); g.set(5, 7 + B, v.p1); }
      leg(q.nf || [.5, 0], v.p1);
      const hoch = !q.carry && q.na && q.na[1] < -3;   // erhobener Arm liegt hinter dem Kopf, damit er das Gesicht nicht zerschneidet
      const nahArm = () => { const [wx, wy] = arm(q.na || [.3, 0], v.j3);
        if (q.ding === 'phone') { g.set(wx, wy - 1, 'A'); g.set(wx, wy, 'g'); }
        if (q.ding === 'cup') { g.set(wx + 1, wy, 'l'); g.set(wx + 1, wy - 1, 'j'); g.set(wx + 1, wy - 2, q.dampf ? 'J' : null); }
        if (q.ding === 'hammer') { const up = q.na[1] < -3; g.line(wx, wy, wx + (up ? 0 : 2), wy - (up ? 3 : 0), 'c'); g.set(wx + (up ? -1 : 2), wy - (up ? 3 : 1), 'h'); g.set(wx + (up ? 1 : 2), wy - (up ? 3 : -0), 'h'); } };
      if (hoch) nahArm();
      const hy = B + kl
      HAT[v.hat].forEach(([x, y, k]) => g.set(x + L, y + hy, v[k]));
      for (const [x, y, k] of [[2, 3, v.hair], [3, 3, v.hair], [4, 3, v.s1], [5, 3, v.s1], [3, 4, v.hair], [4, 4, v.s2], [5, 4, v.s1]]) g.set(x + L, y + hy, k);
      if (v.zopf) { g.set(2 + L, 4 + hy, v.hair); g.set(1 + L, 4 + hy, v.hair); g.set(1 + L, 5 + hy, v.hair); }
      if (v.bart) { g.set(4 + L, 4 + hy, v.hair); g.set(5 + L, 4 + hy, v.hair); }
      if (v.schnauz) g.set(5 + L, 4 + hy, v.hair);
      if (q.carry) { const by = 5 + B; for (let y = by; y <= by + 2; y++) for (let x = 5; x <= 7; x++) g.set(x, y, y === by ? 'e' : x === 7 ? 'c' : 'd'); g.set(6, by + 1, 'C');
        g.line(3.5, 5.5 + B, 5, 6.5 + B, v.j3); g.set(5, 7 + B, v.s1); }
      else if (!hoch) nahArm();
      return g.rows();
    }
    // ---- Vorder- und Rückenansicht. k 0..3 Gehbild, 4 stehen; sit: sitzt auf der Kante (Unterschenkel hängen); ding 'phone'
    function front(v, k, back, sit, ding) {
      const g = Fig(9, 16), wk = !sit && k < 4, ph = k % 4, B = (wk && ph % 2 === 0 ? 1 : 0) + (sit ? 2 : 0), Lf = wk ? [0, 1, 0, 0][ph] : 0, Rf = wk ? [0, 0, 0, 1][ph] : 0, kl = v.klein ? 1 : 0
      if (sit) { for (const x of [3, 5]) { g.set(x, 10, v.p1); g.set(x, 11, v.p2); g.set(x, 12, v.p2); g.set(x, 13, v.boot); } g.set(4, 10, v.p2); }
      else { for (let y = 9 + B; y <= 11 - Lf; y++) g.set(3, y, v.p1); for (let y = 9 + B; y <= 11 - Rf; y++) g.set(5, y, v.p1); g.set(3, 12 - Lf, v.boot); g.set(5, 12 - Rf, v.boot); }
      for (let y = 5 + kl; y <= 8; y++) for (let x = 3; x <= 5; x++) g.set(x, y + B, y === 8 ? v.p2 : x === 3 ? v.j1 : v.j2);
      if (v.mantel && !sit) for (let x = 3; x <= 5; x++) { g.set(x, 8 + B, x === 3 ? v.j1 : v.j2); g.set(x, 9 + B, v.j3); }
      if (v.bib && !back) { g.set(3, 6 + B, v.p1); g.set(5, 6 + B, v.p1); g.set(3, 7 + B, v.p1); g.set(4, 7 + B, v.p1); g.set(5, 7 + B, v.p1); }
      const aL = wk ? [0, -1, 0, 1][ph] : 0
      for (const [x, d] of [[2, aL], [6, -aL]]) { if (ding === 'phone' && x === 6) { g.set(6, 5 + B + kl, v.j3); g.set(6, 4 + B + kl, v.s1); g.set(6, 3 + B + kl, 'g'); continue; }
        if (!kl) g.set(x, 5 + B, v.j3); g.set(x, 6 + B, v.j3); g.set(x, 7 + B + Math.max(0, d), v.j3); g.set(x, 8 + B + d, v.s1); }
      const hy = B + kl, H = q => v[q]
      if (v.hat === 'helm') { g.set(3, hy, H('h1')); g.set(4, hy, H('h1')); g.set(5, hy, H('h2')); for (let x = 2; x <= 6; x++) { g.set(x, 1 + hy, x === 2 || x === 6 ? H('h2') : H('h1')); g.set(x, 2 + hy, x === 2 || x === 6 ? H('h3') : H('h2')); } }
      else if (v.hat === 'muetze') { g.set(4, hy, H('h3')); for (let x = 3; x <= 5; x++) { g.set(x, 1 + hy, x === 5 ? H('h2') : H('h1')); g.set(x, 2 + hy, H('h2')); } g.set(2, 2 + hy, H('h3')); g.set(6, 2 + hy, H('h3')); }
      else { for (let x = 3; x <= 5; x++) g.set(x, 1 + hy, x === 5 ? H('h2') : H('h1')); g.set(2, 2 + hy, H('h2')); g.set(6, 2 + hy, H('h2')); for (let x = 3; x <= 5; x++) g.set(x, 2 + hy, back ? H('h2') : H('h3')); }
      for (let x = 3; x <= 5; x++) { g.set(x, 3 + hy, back ? v.hair : v.s1); g.set(x, 4 + hy, back ? v.s2 : v.s1); }
      if (!back) { const eye = v.s1 === 'c' ? 'U' : 'a'; g.set(3, 3 + hy, eye); g.set(5, 3 + hy, eye); g.set(4, 4 + hy, v.s2);
        if (v.bart) { g.set(3, 4 + hy, v.hair); g.set(4, 4 + hy, v.hair); g.set(5, 4 + hy, v.hair); } if (v.schnauz) g.set(4, 4 + hy, v.hair);
        if (v.zopf) { g.set(2, 3 + hy, v.hair); g.set(6, 3 + hy, v.hair); } }
      else if (v.zopf) { g.set(4, 5 + hy, v.hair); g.set(4, 6 + hy, v.hair); }
      return g.rows();
    }
    // ---- Posen
    const STEP = [[2, 0], [1, 0], [.3, 0], [-.5, 0], [-1.5, 0], [-1.6, 1], [-.2, 1.6], [1.4, 1]]
    const walkQ = (k, carry) => { const n = STEP[k % 8], f = STEP[(k + 4) % 8]; return { bob: k % 4 === 0 ? 1 : 0, nf: n, ff: f, na: [-n[0] * .6, 0], fa: [-f[0] * .6, 0], carry }; };
    const P = {
      walk: [0, 1, 2, 3, 4, 5, 6, 7].map(k => walkQ(k)), carry: [0, 1, 2, 3, 4, 5, 6, 7].map(k => walkQ(k, 1)),
      idle: [{}, {}],
      work: [{ na: [3, -2], fa: [2.5, -2] }, { na: [3, -1.5], fa: [2.5, -2.5] }, { na: [3, -2], fa: [2.5, -2] }, { na: [3.5, -2.5], fa: [2.5, -2] }],   // Hände vorn am Werkstück
      hammer: [{ na: [.8, -7], fa: [2.5, -2], ding: 'hammer' }, { na: [2, -5], fa: [2.5, -2], ding: 'hammer' }, { na: [3, -2], fa: [2.5, -2], ding: 'hammer' }, { na: [3, -2], fa: [2.5, -2], ding: 'hammer' }],
      sit: [{ sit: 1, na: [1.5, -1], fa: [1, -1] }, { sit: 1, na: [2, -3], fa: [1, -1], ding: 'phone' }],
      phone: [{ na: [2, -3.5], ding: 'phone' }, { na: [2, -3], ding: 'phone' }],
      coffee: [{ na: [1.5, -1], ding: 'cup', dampf: 1 }, { na: [1.5, -3.5], ding: 'cup' }],
      stretch: [{ na: [.5, -10.5], fa: [-.8, -10] }, { na: [.9, -10], fa: [-.4, -10] }],
      wave: [{ na: [3, -9] }, { na: [4.2, -7.5] }] }
    // ---- Eule (Waldkauz): sitzend 7 x 9 (blick -1/0/1, 2 = Hinterkopf; blink; puff), fliegend 13 x 8 von vorn (6 Schlagbilder, 'gleit')
    const EULE_Q = [{}, {}, { blink: 1 }, {}, { blick: -1 }, { blick: -1 }, {}, { blick: 1 }, { blick: 1 }, { blick: 2 }, { blick: 2 }, { blick: 1 }, {}, { puff: 1 }, { puff: 1 }, {}];
    function eule(q) { const g = Array.from({ length: 9 }, () => Array(7).fill('.')), o = q.blick || 0;
      const F = { 0: ['beEbEeb', 'beeDeeb'], '-1': ['bEbEeeb', 'bDeeebb'], 1: ['beeEbEb', 'bbeeeDb'], 2: ['bbcccbb', 'bcccccb'] }[o];
      ['.b...b.', '.bbbbb.', F[0], F[1], 'bcdcdcb', 'bcdedcb', 'bcdcdcb', '.bcccb.', '..E.E..'].forEach((r, y) => [...r].forEach((k, x) => { if (k !== '.') g[y][x] = (k === 'E' && y === 2 && q.blink) ? 'c' : k; }));
      if (q.puff) { g[4][0] = 'b'; g[4][6] = 'b'; g[5][0] = 'b'; g[5][6] = 'b'; }
      return g.map(r => r.join('')); }
    const FW = [[-1, -3], [0, -1], [0, 1], [1, 3], [0, 1], [-1, -1]];
    function flug(k) { const W = 13, H = 8, g = Array.from({ length: H }, () => Array(W).fill('.')), set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; },
        line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(Math.round(x1) - Math.round(x0)), Math.abs(Math.round(y1) - Math.round(y0)), 1); for (let i = 0; i <= n; i++) set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
        [e, t] = k === 'gleit' ? [0, -1] : FW[k], cx = 6, cy = 3;
      for (const sd of [-1, 1]) { const sx = cx + sd, ex = cx + sd * 3, tx = cx + sd * 5;
        line(sx, cy, ex, cy + e, 'c'); line(sx, cy + 1, ex, cy + 1 + e, 'd'); line(ex, cy + e, tx, cy + t, 'c'); line(ex, cy + 1 + e, tx - sd, cy + t + 1, 'b'); set(tx, cy + t, 'b'); set(tx + sd, cy + t, 'b'); set(ex, cy + e + 2, 'b'); }
      for (const [x, y, c] of [[5, 1, 'b'], [7, 1, 'b'], [5, 2, 'E'], [6, 2, 'b'], [7, 2, 'E'], [5, 3, 'e'], [6, 3, 'D'], [7, 3, 'e'], [5, 4, 'c'], [6, 4, 'd'], [7, 4, 'c'], [6, 5, 'b'], [5, 6, 'E'], [7, 6, 'E']]) set(x, y, c);
      return g.map(r => r.join('')); }
    const cache = {}
    function bilder(vi) {
      if (cache[vi]) return cache[vi];
      const v = VS[vi], o = {};
      for (const k in P) o[k] = P[k].map(q => side(v, q));
      o.vorn = [0, 1, 2, 3, 4].map(k => front(v, k, false));
      o.hinten = [0, 1, 2, 3, 4].map(k => front(v, k, true));
      o.sitzvorn = [front(v, 4, false, true), front(v, 4, false, true, 'phone')];
      o.ruderer = [-1, 0, 1].map(l => side(v, { sit: 1, lean: l, na: [3 + l, -1], fa: [3 + l, -1.5] }));
      return (cache[vi] = o);
    }
    return { bilder, VS, side, front, eule, flug, EULE_Q };
  })();
  /* /HOF-KERN */
  /* v159: kleine Figuren draußen aus HOF-KERN (pxl); 5 = Nachtwächter, 6 = Angler, 7 = Ruderer. Strecken entfällt (sieht klein seltsam aus) -> Stehen */
  const HS = {};
  function hofSet(hi) { if (HS[hi]) return HS[hi]; const B = HOFFIG.bilder(hi), m = k => B[k].map(r => buildSprite(r)), idle = m('idle'), walk = m('walk'), work = m('work');
    return (HS[hi] = { walk, carry: m('carry'), idle, work, hammer: m('hammer'), push: walk, reach: work, sit: m('sit'), phone: m('phone'), coffee: m('coffee'), stretch: idle, wave: m('wave'),
      vorn: m('vorn'), hinten: m('hinten'), sitzvorn: m('sitzvorn'), ruderer: m('ruderer'), S: SMALL }); }
  const hofIdx = vi => vi >= 5 && vi <= 7 ? vi : ((vi % 5) + 5) % 5;
  function make(S, v) {
    if (S === BIG) {   // v150: Pixelfiguren (figpx.js), gleiche Namen wie bisher; S: Maße wie die alten großen Figuren (Füße unten)
      const P = FIGPX.sprites(v.px);
      return { px: 1, walk: P.walk, carry: P.carry, push: P.push, pull: P.pull, idle: P.idle, reach: P.reach, sit: P.sit, phone: P.phone, coffee: P.coffee,
        stretch: P.wave, wave: P.wave, halten: P.halten, work: P.work, hammer: P.hammer, front: P.front, back: P.back, fidle: P.fidle,
        S: { w: 24, h: 30, hipY: 21, hipX: 9, thigh: 4, shin: 4, shY: 15, shX: 8, ua: 3.6, fa: 3.4 } };
    }
    const N = 8;
    const walk = [], carry = [];
    for (let i = 0; i < N; i++) { walk.push(render(S, v, walkPose(i, N, S, false))); carry.push(render(S, v, walkPose(i, N, S, true))); }
    const stand = (ar, dy) => ({ dy: dy || 0, legs: [{ a: .06, b: 0 }, { a: -.06, b: 0 }], arms: ar });
    const idle = [render(S, v, stand([{ a: .05, b: .15 }, { a: -.05, b: .15 }])), render(S, v, stand([{ a: .08, b: .2 }, { a: -.02, b: .2 }]))];
    const work = [render(S, v, stand([{ a: .6, b: .5 }, { a: .5, b: .5 }])), render(S, v, stand([{ a: .7, b: .4 }, { a: .5, b: .5 }]))];
    const hammer = work.concat(work);
    const sitS = (ar, extra) => Object.assign({ dy: 3, legs: [{ a: 1.45, b: 1.5 }, { a: 1.3, b: 1.45 }], arms: ar }, extra || {});
    const sit = [render(S, v, sitS([{ a: .3, b: .6 }, { a: .2, b: .5 }])), render(S, v, sitS([{ a: .4, b: 2.1 }, { a: .2, b: .5 }], { phone: 1 }))];
    const phone = [render(S, v, Object.assign(stand([{ a: .4, b: 2.1 }, { a: -.05, b: .15 }]), { phone: 1 })), render(S, v, Object.assign(stand([{ a: .35, b: 2.2 }, { a: -.05, b: .15 }]), { phone: 1 }))];
    const stretch = [render(S, v, stand([{ a: 2.9, b: .05 }, { a: 2.7, b: .1 }], -1)), render(S, v, stand([{ a: 2.6, b: .3 }, { a: 2.5, b: .3 }]))];
    const wave = [render(S, v, stand([{ a: 2.2, b: .3 }, { a: -.05, b: .15 }])), render(S, v, stand([{ a: 2.6, b: -.2 }, { a: -.05, b: .15 }]))];
    return { walk, carry, idle, work: work.concat(work), hammer, push: walk, reach: work, sit, phone, coffee: phone, stretch, wave, S };
  }
  function frontSmall(v, back, k) {   // k: 0..3 Gehbild, 4 = stehen; schmal wie die Seitenansicht
    const g = Grid(9, 14), step = k < 4 ? [1, 0, -1, 0][k] : 0;
    g.rect(3, 0, 3, 1, v.h1); g.rect(2, 1, 5, 1, v.h2); g.set(3, 1, v.h1);                                  // Helm
    if (back) g.rect(3, 2, 3, 2, v.hair); else { g.rect(3, 2, 3, 2, v.s1); g.set(3, 2, 'a'); g.set(5, 2, 'a'); g.set(3, 3, '.'); g.set(5, 3, '.'); g.set(4, 3, v.s1); g.set(2, 2, v.s2); g.set(6, 2, v.s2); }
    for (let y = 4; y < 9; y++) for (let x = 3; x < 6; x++) g.set(x, y, x === 3 ? v.j1 : x === 5 ? v.j3 : v.j2);
    g.rect(2, 4 + Math.max(0, step), 1, 4, v.j3); g.set(2, 8 + Math.max(0, step), v.s1); g.rect(6, 4 + Math.max(0, -step), 1, 4, v.j3); g.set(6, 8 + Math.max(0, -step), v.s1);   // Arme schwingen
    g.rect(3, 9, 3, 1, v.p2);
    const lL = 3 - (step > 0 ? 1 : 0), lR = 3 - (step < 0 ? 1 : 0);
    g.rect(3, 10, 1, lL, v.p1); g.set(3, 10 + lL, 'a'); g.rect(5, 10, 1, lR, v.p1); g.set(5, 10 + lR, 'a');
    return buildSprite(g.rows());
  }
  function frontSitSmall(v, phone) {   // sitzt frontal auf der Bank: Hände im Schoß, Unterschenkel hängen herunter
    const g = Grid(9, 13);
    g.rect(3, 0, 3, 1, v.h1); g.rect(2, 1, 5, 1, v.h2); g.set(3, 1, v.h1);
    g.rect(3, 2, 3, 2, v.s1); g.set(3, 2, 'a'); g.set(5, 2, 'a'); g.set(3, 3, '.'); g.set(5, 3, '.'); g.set(4, 3, v.s1); g.set(2, 2, v.s2); g.set(6, 2, v.s2);
    for (let y = 4; y < 9; y++) for (let x = 3; x < 6; x++) g.set(x, y, x === 3 ? v.j1 : x === 5 ? v.j3 : v.j2);
    g.rect(2, 9, 5, 1, v.p2); g.rect(2, 10, 5, 1, v.p1);                                     // Schoß (verkürzte Oberschenkel)
    g.rect(2, 4, 1, 5, v.j3); g.rect(6, 4, 1, phone ? 2 : 5, v.j3); g.set(3, 9, v.s1); g.set(2, 9, v.s1);
    if (phone) { g.set(5, 5, v.j3); g.set(4, 4, v.s1); g.set(4, 3, 'a'); g.set(5, 9, v.p2); } else g.set(5, 9, v.s1);   // Handy am Ohr oder Hände im Schoß
    g.set(3, 11, v.p1); g.set(5, 11, v.p1); g.rect(2, 12, 2, 1, 'a'); g.rect(5, 12, 2, 1, 'a');
    return buildSprite(g.rows());
  }
  const FSS = {};
  function frontSit(vi) { return hofSet(hofIdx(vi)).sitzvorn; }   // v159: aus HOF-KERN
  const FBB = {};
  function frontB(vi, back) { const key = vi + (back ? 'b' : 'f'); return FBB[key] || (FBB[key] = [0, 1, 2, 3, 4, 5, 6].map(k => chFront(vOf(vi), back, k))); }   // v150: 6 Gehbilder, [6] = stehen
  const FB = {};
  function front(vi, back) { const H = hofSet(hofIdx(vi)); return back ? H.hinten : H.vorn; }   // v159: aus HOF-KERN
  // fertige Figur mit den Füßen auf Höhe feet zeichnen
  function put(g, s, x, feet, flip) { ART.blit(g, s, x, feet + 1, null, flip); }
  const cache = {};
  function set(size, vi) { if (size !== 'big' && vi < 98) return hofSet(hofIdx(vi)); const k = size + vi; if (!cache[k]) cache[k] = make(size === 'big' ? BIG : SMALL, vOf(vi)); return cache[k]; }

  // ---------- Verhalten ----------
  // spots: [{x, face, act: 'work'|'hammer'|'idle'|'pick'|'drop'}]; Wege nur zwischen diesen Punkten
  const crews = {};
  function crew(key, n, spots, size, x0, x1, vFix) {
    let c = crews[key];
    if (!c || c.length !== n) {
      c = crews[key] = [];
      for (let i = 0; i < n; i++) { const sp = spots[(i * 2 + 1) % spots.length]; c.push({ v: vFix !== undefined && i === 0 ? vFix : (i * 3 + key.length) % VAR.length, x: sp.x + (i % 2 ? 6 : -6), dir: 1, st: 'act', act: sp.act, face: sp.face, t: 1 + i * 1.7, dist: 0, box: false, spot: (i * 2 + 1) % spots.length, size }); }
    }
    c.spots = spots; c.x0 = x0; c.x1 = x1;
    return c;
  }
  function step(c, dt) {
    const sp = c.spots;
    c.forEach((a, i) => {
      a.t -= dt;
      if (a.st === 'walk') {
        const spd = (a.size === 'big' ? (a.box ? 8 : 10) : (a.box ? 3.4 : 4.2)) * (a.mul || (a.mul = .7 + ((a.v * 37 + i * 53) % 10) / 14)), d = a.tx - a.x, s = Math.sign(d) * Math.min(Math.abs(d), spd * dt);
        a.x += s; a.dist += Math.abs(s); a.dir = Math.sign(d) || a.dir;
        if (Math.abs(a.tx - a.x) < .2) { a.st = 'act'; const p = sp[a.spot]; a.act = p.act; a.face = p.face || a.dir;
          if (a.act === 'idle') a.act = ['idle', 'phone', 'stretch', 'idle', 'wave'][Math.floor(Math.random() * 5)];   // Ruheplatz: mal am Handy, mal strecken, mal winken
          a.t = a.act === 'sit' ? 8 + Math.random() * 8 : a.act === 'pier' ? 20 + Math.random() * 6 : a.act === 'pond' ? 28 + Math.random() * 6 : a.act === 'look' ? 12 + Math.random() * 5 : a.act === 'coffee' ? 7 + Math.random() * 6 : a.act === 'phone' ? 5 + Math.random() * 6 : a.act === 'stretch' || a.act === 'wave' ? 2.5 + Math.random() * 2 : p.act === 'pick' || p.act === 'drop' ? 1.2 : a.act === 'idle' ? 2 + Math.random() * 4 : 5 + Math.random() * 4; a.tt = a.t; }
      } else if (a.t <= 0) {
        // nächstes Ziel: bevorzugt ein Ort, an dem niemand steht
        let next = a.spot, tries = 0;
        do { next = a.box ? sp.findIndex(p => p.act === 'drop') : Math.floor(Math.random() * sp.length); tries++; } while ((next === a.spot || next < 0 || c.some((b, j) => j !== i && b.spot === next)) && tries < 8);
        if (next < 0) next = (a.spot + 1) % sp.length;
        a.spot = next; a.st = 'walk'; a.tx = sp[next].x + (Math.random() - .5) * 4;
        a.tx = Math.max(c.x0, Math.min(c.x1, a.tx));
      }
    });
  }
  function draw(g, c, base, time, L) {
    ART.OCC.on = true; try { draw0(g, c, base, time, L); } finally { ART.OCC.on = false; }
  }
  function draw0(g, c, base, time, L) {
    /* v159: wer an seinem Platz arbeitet (oder nach hinten schaut), steht der Maschine am nächsten und wird zuerst gezeichnet; wer läuft, geht vorn vorbei */
    const rank = a => a.st === 'walk' ? 2 : a.st === 'act' ? 0 : 1;
    const sorted = c.slice().sort((p, q) => rank(p) - rank(q) || p.v - q.v);
    for (const a of sorted) {
      const W = set(a.size, a.vn !== undefined ? a.vn : a.v), S = W.S;   /* v159: vn = Rolle (Nachtwächter, Angler) */
      let s;
      const stride = a.size === 'big' ? 14 : 7;   /* v165: innen 14 px je Doppelschritt, so weit wandert der Fuß in den Gehbildern */
      if (!isFinite(a.x)) continue; if (!isFinite(a.dist)) a.dist = 0;   /* nie mit kaputten Werten zeichnen */
      if (a.st === 'walk') { const L = a.box ? W.carry : W.walk; s = L[((Math.floor(a.dist / stride * L.length) % L.length) + L.length) % L.length]; }
      else if (a.act === 'work') s = W.work[Math.floor(time * 1.6 * tak(a).sp + tak(a).ph) % 4];   /* v150: jeder in seinem Takt */
      else if (a.act === 'hammer') { const ph = (time * .9 * tak(a).sp + tak(a).ph) % 1; s = W.hammer[ph < .45 ? 0 : ph < .7 ? 1 : ph < .8 ? 2 : 3]; }
      else if (a.box) s = W.carry[0];
      else if (a.act === 'sit' && a.st === 'act' && a.size === 'small') { ART.blit(g, frontSit(a.v)[Math.floor(time * .25 + a.v) % 3 === 0 ? 1 : 0], Math.round(a.x), base - 3, null, false); continue; }   // auf der Bank: frontal
      else if (a.act === 'sit') s = W.sit[Math.floor(time * .25 + a.v) % 3 === 0 ? 1 : 0];
      else if (a.act === 'phone') s = W.phone[Math.floor(time * (W.px ? 4 : .8) * tak(a).sp + tak(a).ph) % W.phone.length];
      else if (a.act === 'coffee') s = W.coffee[(time * .4 * tak(a).sp + tak(a).ph) % 1 < .25 ? 1 : 0];
      else if (a.act === 'stretch' || a.act === 'wave') s = W[a.act][Math.floor(time * 2.2 + a.v) % 2];
      else if (a.act === 'pier' || a.act === 'pond') { if (a.st === 'act') continue; s = W.idle[0]; }
      else if (a.act === 'look' && a.st === 'act' && a.size === 'big') {   // geht nach hinten, schaut sich etwas an (Ehrentafel, Brett), kommt zurück
        const sp = c.spots[a.spot] || {}, dep = sp.depth || 10, q = 1 - a.t / (a.tt || 1), up = q < .3, down = q > .7, f = up ? q / .3 : down ? (1 - q) / .3 : 1, d = Math.round(f * dep);
        const F = frontB(a.v, !down), fr = (up || down) ? F[Math.floor(d / 2) % 6] : F[6];
        ART.blit(g, fr, a.x, base - d + 1, null, false); continue; }
      else s = W.idle[Math.floor(time * (W.px ? 7 : .7) * tak(a).sp + tak(a).ph * 5) % W.idle.length];   // Pixelfiguren: atmen, blinzeln, schauen sich um
      if (!s) continue;
      const flip = (a.st === 'walk' ? a.dir : a.face) < 0;
      const lift = a.act === 'sit' && a.st === 'act' ? (a.size === 'big' ? 4 : 2) : 0;   // sitzt auf Bank oder Kiste
      if (a.size === 'big') put(g, s, a.st === 'walk' ? Math.round(a.x - (a.dir || 1) * (a.dist % (stride / 8))) : a.x, base - lift, flip);   /* v165: rückt im Takt der Bilder vor, Fuß rutscht nicht */ else ART.blit(g, s, a.x, base - lift + Math.round(S.h - S.hipY - S.thigh - S.shin), null, flip);
    }
  }
  return { set, hofSet, HOFFIG, crew, step, draw, put, front, frontB, frontSit, VAR, BIG, SMALL, crews, chFront, MEISTER, tak };
})();
