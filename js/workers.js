// Arbeiterinnen und Arbeiter: Figuren aus einem kleinen Skelett (Hüfte, Knie, Fuß, Schulter, Ellbogen, Hand)
// Gehzyklus mit 8 Bildern, Kopfnicken durch das Standbein, Armschwung gegengleich, Fußbild an die Strecke gekoppelt (kein Rutschen).
'use strict';
const WORKERS = (() => {
  const { Grid, buildSprite } = ART;
  // Farbvarianten: Helm hell/dunkel, Haut, Jacke hell/mittel/dunkel, Hose, Hose dunkel, Haare
  const VAR = [
    { h1: 'F', h2: 'E', s1: 'R', s2: 'S', j1: 'A', j2: 'z', j3: 'y', p1: 'x', p2: 'U', hair: 'b' },
    { h1: 'l', h2: 'j', s1: 'd', s2: 'c', j1: 'Q', j2: 'P', j3: 'O', p1: 'g', p2: 'a', hair: 'a' },
    { h1: 'v', h2: 'u', s1: 'R', s2: 'S', j1: 'q', j2: 'o', j3: 'n', p1: 'x', p2: 'U', hair: 'C' },
    { h1: 'F', h2: 'E', s1: 'c', s2: 'b', j1: 'j', j2: 'h', j3: 'g', p1: 'y', p2: 'x', hair: 'a' },
    { h1: 'l', h2: 'j', s1: 'R', s2: 'S', j1: 'w', j2: 'v', j3: 't', p1: 'g', p2: 'a', hair: 'D' }
  ];
  const PORTER = { h1: 'x', h2: 'U', cap: 1, s1: 'R', s2: 'S', j1: 'y', j2: 'x', j3: 'U', p1: 'T', p2: 'U', hair: 'b' };   // Pförtner: dunkelblaue Uniform, Schirmmütze
  const vOf = vi => vi === 99 ? PORTER : VAR[vi % VAR.length];
  const BIG = { w: 18, h: 29, hipY: 17, hipX: 7, thigh: 5, shin: 5, shY: 9.5, shX: 7, ua: 4.2, fa: 4, th: 2, boot: 4 };
  const SMALL = { w: 9, h: 14, hipY: 8, hipX: 3, thigh: 2.6, shin: 2.6, shY: 4.6, shX: 3, ua: 2, fa: 2, th: 1, boot: 2 };

  function line(g, x0, y0, x1, y1, c, th) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); for (let k = 0; k < th; k++) g.set(x + k, y, c); }
  }
  // pose: dy, legs [{a, b}] (Oberschenkelwinkel, Kniebeuge), arms [{a, b}], carry
  function render(S, v, pose) {
    const g = Grid(S.w, S.h), dy = pose.dy || 0, big = S === BIG;
    const hip = [S.hipX, S.hipY + dy], sh = [S.shX, S.shY + dy];
    const leg = (L, far) => {
      const kx = hip[0] + Math.sin(L.a) * S.thigh, ky = hip[1] + Math.cos(L.a) * S.thigh, f = L.a - L.b;
      const fx = kx + Math.sin(f) * S.shin, fy = ky + Math.cos(f) * S.shin;
      const c = far ? v.p2 : v.p1;
      line(g, hip[0], hip[1], kx, ky, c, S.th); line(g, kx, ky, fx, fy, c, S.th);
      const bx = Math.round(fx), by = Math.round(fy);
      for (let i = 0; i < S.boot; i++) g.set(bx - (big ? 1 : 0) + i, by, far ? 'a' : 'a');
      if (big) for (let i = 0; i < S.boot - 1; i++) g.set(bx - 1 + i, by - 1, far ? 'a' : 'b');
    };
    const arm = (A, far) => {
      const ex = sh[0] + Math.sin(A.a) * S.ua, ey = sh[1] + Math.cos(A.a) * S.ua, f = A.a + A.b;
      const hx = ex + Math.sin(f) * S.fa, hy = ey + Math.cos(f) * S.fa;
      line(g, sh[0], sh[1], ex, ey, far ? v.p2 : v.j3, S.th); line(g, ex, ey, hx, hy, far ? v.p2 : v.j3, S.th);
      const x = Math.round(hx), y = Math.round(hy);
      g.set(x, y, far ? v.s2 : v.s1); if (big) { g.set(x + 1, y, v.s2); g.set(x, y + 1, v.s2); }
      if (!far && pose.phone) { g.set(x + 1, y - 1, 'U'); g.set(x + 1, y, 'B'); }
      if (!far && pose.cup) { g.set(x + 1, y - 1, 'J'); g.set(x + 1, y, 'J'); }
    };
    // hinten: fernes Bein und ferner Arm
    leg(pose.legs[1], true); if (!pose.carry) arm(pose.arms[1], true);
    // Rumpf
    if (big) {
      for (let y = 8; y <= 16; y++) for (let x = 4; x <= 10; x++) {
        if ((y === 8 && (x === 4 || x === 10))) continue;
        g.set(x, y + dy, x === 4 ? v.j1 : x >= 9 ? v.j3 : v.j2);
      }
      g.set(9, 10 + dy, v.j3); g.set(8, 12 + dy, v.j3); g.set(9, 12 + dy, v.j3);   // Brusttasche
      for (let x = 4; x <= 10; x++) g.set(x, 16 + dy, v.p2);                      // Gürtel
      g.set(8, 16 + dy, 'E');
      for (let x = 4; x <= 10; x++) g.set(x, 17 + dy, v.p1);
      // Kopf
      for (let y = 3; y <= 7; y++) for (let x = 5; x <= 10; x++) g.set(x, y + dy, x <= 5 ? v.hair : (x === 6 && y >= 5) ? v.s2 : v.s1);
      g.set(10, 7 + dy, '.'); g.set(5, 7 + dy, '.'); g.set(11, 5 + dy, v.s1);   // Kinn, Nase
      g.set(9, 4 + dy, 'a'); g.set(7, 5 + dy, v.s2);                            // Auge, Ohr
      g.set(9, 6 + dy, v.s2);                                                   // Mund
      g.set(6, 8 + dy, v.s2); g.set(7, 8 + dy, v.s2);                           // Hals
      // Helm mit Schirm nach vorn
      for (let x = 5; x <= 10; x++) g.set(x, dy, x === 5 ? '.' : x <= 7 ? v.h1 : v.h2);
      for (let x = 4; x <= 11; x++) g.set(x, 1 + dy, x <= 6 ? v.h1 : v.h2);
      for (let x = 4; x <= 12; x++) g.set(x, 2 + dy, x === 12 ? v.h2 : v.h2);
      g.set(6, 1 + dy, 'G');
    } else {
      for (let y = 4; y <= 7; y++) for (let x = 2; x <= 4; x++) g.set(x, y + dy, x === 2 ? v.j1 : x === 4 ? v.j3 : v.j2);
      for (let x = 2; x <= 4; x++) g.set(x, 8 + dy, v.p2);
      g.set(2, 2 + dy, v.hair); g.set(3, 2 + dy, v.s1); g.set(4, 2 + dy, v.s1); g.set(3, 3 + dy, v.s2); g.set(4, 3 + dy, v.s1);
      g.set(2, dy, v.h1); g.set(3, dy, v.h1); g.set(4, dy, v.h2);
      for (let x = 1; x <= 5; x++) g.set(x, 1 + dy, x <= 2 ? v.h1 : v.h2);
    }
    leg(pose.legs[0], false);
    if (pose.carry) {
      // Kiste vor der Brust, beide Hände darunter
      const bx = big ? 10 : 5, by = big ? 9 + dy : 4 + dy, bw = big ? 6 : 3, bh = big ? 6 : 3;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) g.set(bx + x, by + y, (y === 0 || x === 0) ? 'e' : (y === bh - 1 || x === bw - 1) ? 'c' : (big && y === 2) ? 'c' : 'd');
      g.set(bx, by + bh, v.s1); if (big) g.set(bx + 1, by + bh, v.s1);
      line(g, sh[0], sh[1], bx, by + bh - 1, v.j2, S.th);
    } else arm(pose.arms[0], false);
    if (pose.tool && big) { const t = pose.tool; line(g, t[0], t[1] + dy, t[2], t[3] + dy, 'h', 1); g.set(Math.round(t[2]), Math.round(t[3] + dy), 'j'); }
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
  // ---------- große Figuren (innen): kräftigere Proportionen, Gehzyklus nach Schlüsselposen ----------
  const BIG2 = { w: 20, h: 30, hipY: 18, hipX: 9, thigh: 5.5, shin: 5.5, shY: 10.5, shX: 9, ua: 4.5, fa: 4.2 };
  const D2R = Math.PI / 180;
  function renderBig(v, pose) {
    const S = BIG2, g = Grid(S.w, S.h), dy = pose.dy || 0;
    const hip = [S.hipX, S.hipY + dy], sh = [S.shX, S.shY + dy];
    const thick = (x0, y0, x1, y1, cs) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); cs.forEach((c, k) => g.set(x + k - 1, y, c)); } };
    const leg = (L, far) => {
      const a = L.a * D2R, f = (L.a - L.b) * D2R;
      const kx = hip[0] + Math.sin(a) * S.thigh, ky = hip[1] + Math.cos(a) * S.thigh, fx = kx + Math.sin(f) * S.shin, fy = ky + Math.cos(f) * S.shin;
      const c = far ? [v.p2, v.p2] : [v.p1, v.p2];   // schlanke Beine, 2 Pixel breit
      thick(hip[0] + .5, hip[1], kx + .5, ky, c); thick(kx + .5, ky, fx + .5, Math.min(fy, S.h - 2), c);
      const bx = Math.round(fx), by = Math.min(S.h - 1, Math.round(fy));
      if (L.toe) { for (let i = 0; i <= 2; i++) g.set(bx + i, by, 'a'); g.set(bx - 1, by - 1, 'a'); g.set(bx, by - 1, far ? 'a' : 'b'); g.set(bx + 1, by - 1, far ? 'a' : 'b'); }
      else { for (let i = -1; i <= 2; i++) g.set(bx + i, by, 'a'); for (let i = -1; i <= 1; i++) g.set(bx + i, by - 1, far ? 'a' : (i < 1 ? 'b' : 'c')); }
    };
    const arm = (A, far) => {
      const a = A.a * D2R, f = (A.a + A.b) * D2R;
      const ex = sh[0] + Math.sin(a) * S.ua, ey = sh[1] + Math.cos(a) * S.ua, hx = ex + Math.sin(f) * S.fa, hy = ey + Math.cos(f) * S.fa;
      const c = far ? [v.j3, v.j3] : [v.j1, v.j3];
      thick(sh[0], sh[1], ex, ey, c); thick(ex, ey, hx, hy, c);
      const x = Math.round(hx), y = Math.round(hy);
      g.set(x, y, far ? v.s2 : v.s1); g.set(x - 1, y, far ? v.s2 : v.s1); g.set(x, y + 1, v.s2); g.set(x - 1, y + 1, v.s2);
      if (!far && pose.phone) { g.rect(x + 1, y - 2, 2, 3, 'U'); g.set(x + 1, y - 2, 'z'); g.set(x + 1, y - 1, 'B'); }   // Handy, Bildschirm leuchtet
      if (!far && pose.cup) { g.rect(x + 1, y - 2, 2, 3, 'J'); g.set(x + 1, y - 2, 'b'); g.set(x + 3, y - 1, 'J'); }      // Kaffeetasse
      return [x, y];
    };
    if (!pose.carry) arm(pose.arms[1], true);
    if (pose.armsBack && !pose.carry) arm(pose.arms[0], false);
    leg(pose.legs[1], true);
    // Rumpf: Jacke mit Licht von links, Reißverschluss, Gürtel
    for (let y = 9; y <= 17; y++) for (let x = 6; x <= 12; x++) {
      if (y === 9 && (x === 6 || x === 12)) continue;
      g.set(x, y + dy, x === 6 ? v.j1 : x >= 11 ? v.j3 : (x === 7 && y < 13) ? v.j1 : v.j2);
    }
    for (let y = 10; y <= 16; y++) g.set(11, y + dy, v.j3);
    g.set(12, 9 + dy, '.'); for (let x = 6; x <= 12; x++) g.set(x, 17 + dy, v.p2); g.set(10, 17 + dy, 'E');
    leg(pose.legs[0], false);
    // Kopf im Profil
    for (let y = 3; y <= 8; y++) for (let x = 8; x <= 13; x++) g.set(x, y + dy, x <= 8 ? v.hair : (x === 9 && y >= 5) ? v.hair : v.s1);
    g.set(13, 8 + dy, '.'); g.set(8, 8 + dy, '.'); g.set(14, 5 + dy, v.s1); g.set(14, 6 + dy, v.s2);   // Nase
    g.set(12, 5 + dy, 'a'); g.set(10, 6 + dy, v.s2); g.set(12, 7 + dy, v.s2); g.set(13, 4 + dy, v.s2);  // Auge, Ohr, Mund, Braue
    g.set(10, 8 + dy, v.s2); g.set(11, 8 + dy, v.s2);
    if (v.cap) {   // Schirmmütze mit goldenem Band und Abzeichen, Uniform mit Goldknöpfen
      for (let x = 8; x <= 13; x++) { g.set(x, dy, v.h1); g.set(x, 1 + dy, x === 8 ? v.h1 : v.h2); } g.set(7, 1 + dy, v.h1);
      for (let x = 7; x <= 13; x++) g.set(x, 2 + dy, 'D'); g.set(10, 1 + dy, 'F'); for (let x = 13; x <= 15; x++) g.set(x, 3 + dy, 'a');
      g.set(10, 11 + dy, 'E'); g.set(10, 14 + dy, 'E');
    } else {
    // Helm mit Schirm
    for (let x = 8; x <= 13; x++) g.set(x, dy, x === 8 ? '.' : x <= 10 ? v.h1 : v.h2);
    for (let x = 7; x <= 14; x++) g.set(x, 1 + dy, x <= 9 ? v.h1 : v.h2);
    for (let x = 7; x <= 16; x++) g.set(x, 2 + dy, x >= 14 ? v.h2 : v.h2);
    g.set(9, 1 + dy, 'G'); }
    if (pose.carry) {
      const bx = 12, by = 10 + dy;
      for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) g.set(bx + x, by + y, (y === 0 || x === 0) ? 'e' : (y === 5 || x === 6) ? 'c' : y === 2 ? 'c' : 'd');
      thick(sh[0], sh[1], 11, by + 5, [v.j2, v.j3]); g.set(12, by + 6, v.s1); g.set(13, by + 6, v.s1);
    } else if (!pose.armsBack) arm(pose.arms[0], false);
    return buildSprite(g.rows());
  }
  // Rückenansicht: arbeitet an der Maschine (Hände am Bedienfeld) oder hämmert
  function renderBack(v, pose) {
    const S = BIG2, g = Grid(S.w, S.h);
    for (let y = 18; y <= 28; y++) { g.set(7, y, v.p1); g.set(8, y, v.p2); g.set(10, y, v.p1); g.set(11, y, v.p2); }
    for (let x = 6; x <= 9; x++) g.set(x, 29, 'a'); for (let x = 10; x <= 13; x++) g.set(x, 29, 'a'); g.set(7, 28, 'b'); g.set(8, 28, 'b'); g.set(10, 28, 'b'); g.set(11, 28, 'b');
    const hand = (sx, hy, side) => { const ex = sx + side; for (let y = 10; y < hy; y++) { g.set(ex, y, side < 0 ? v.j1 : v.j3); g.set(ex - side, y, v.j2); } g.set(ex, hy, v.s1); g.set(ex - side, hy, v.s2); };
    for (let y = 9; y <= 17; y++) for (let x = 6; x <= 12; x++) { if (y === 9 && (x === 6 || x === 12)) continue; g.set(x, y, x === 6 ? v.j1 : x === 12 ? v.j3 : v.j2); }
    for (let y = 11; y <= 15; y++) g.set(9, y, v.j3);                        // Rückennaht
    for (let x = 7; x <= 11; x++) g.set(x, 13, 'F');                          // Warnstreifen auf dem Rücken
    for (let x = 6; x <= 12; x++) g.set(x, 17, v.p2);
    if (pose.hammer !== undefined) {
      const up = pose.hammer;  // 0 oben, 1 unten
      hand(6, 12, -1);
      const hy = Math.round(3 + up * 9); for (let y = Math.min(hy, 10); y <= 10; y++) { g.set(13, y, v.j3); g.set(12, y, v.j2); }
      g.set(13, hy, v.s1); g.set(13, hy - 1, 'c'); g.set(13, hy - 2, 'c'); g.set(12, hy - 3, 'h'); g.set(13, hy - 3, 'h'); g.set(14, hy - 3, 'h');
    } else { hand(6, pose.hands[0], -1); hand(12, pose.hands[1], 1); }
    for (let y = 3; y <= 8; y++) for (let x = 7; x <= 11; x++) g.set(x, y, y >= 8 ? v.s2 : v.hair);
    g.set(6, 5, v.s2); g.set(12, 5, v.s2);                                    // Ohren
    for (let x = 7; x <= 11; x++) g.set(x, 0, x === 7 ? '.' : v.h1); for (let x = 6; x <= 12; x++) { g.set(x, 1, x <= 8 ? v.h1 : v.h2); g.set(x, 2, v.h2); }
    return buildSprite(g.rows());
  }
  // Schlüsselposen eines Schritts (Grad: Oberschenkel nach vorn, Kniebeuge)
  const LEGK = [[22, 4], [14, 12], [3, 8], [-12, 4], [-20, 8], [-10, 30], [6, 34], [17, 16]];
  const DYK = [0, 1, 0, 0, 0, 1, 0, 0];
  function walkBig(v, carry) {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const A = LEGK[i], B = LEGK[(i + 4) % 8];
      const legs = [{ a: A[0], b: A[1], toe: A[0] < -15 }, { a: B[0], b: B[1], toe: B[0] < -15 }];
      const arms = [{ a: -A[0] * .9, b: 18 + Math.max(0, -A[0]) * .4 }, { a: -B[0] * .9, b: 18 + Math.max(0, -B[0]) * .4 }];
      out.push(renderBig(v, { dy: DYK[i], legs, arms, carry }));
    }
    return out;
  }
  function make(S, v) {
    if (S === BIG) {
      const stand = (arms, dy) => ({ dy: dy || 0, legs: [{ a: 4, b: 0 }, { a: -4, b: 0 }], arms });
      const walk = walkBig(v, false), carry = walkBig(v, true);
      const idle = [renderBig(v, stand([{ a: 6, b: 10 }, { a: -6, b: 10 }])), renderBig(v, stand([{ a: 8, b: 14 }, { a: -4, b: 12 }], 0))];
      const work = [renderBack(v, { hands: [12, 14] }), renderBack(v, { hands: [13, 12] }), renderBack(v, { hands: [14, 13] }), renderBack(v, { hands: [12, 13] })];
      const hammer = [renderBack(v, { hammer: 0 }), renderBack(v, { hammer: .4 }), renderBack(v, { hammer: 1 }), renderBack(v, { hammer: 1 })];
      const push = [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const A = LEGK[i], B = LEGK[(i + 4) % 8]; return renderBig(v, { dy: DYK[i], legs: [{ a: A[0] * .8, b: A[1] }, { a: B[0] * .8, b: B[1] }], arms: [{ a: 70, b: 10 }, { a: 66, b: 14 }] }); });
      const pull = [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const A = LEGK[i], B = LEGK[(i + 4) % 8]; return renderBig(v, { dy: DYK[i], legs: [{ a: A[0] * .8, b: A[1] }, { a: B[0] * .8, b: B[1] }], arms: [{ a: -38, b: 8 }, { a: -30, b: 10 }] }); });
      const reach = [renderBig(v, stand([{ a: 60, b: 20 }, { a: 50, b: 25 }])), renderBig(v, stand([{ a: 70, b: 10 }, { a: 55, b: 20 }]))];
      const sitP = arms => ({ dy: 6, legs: [{ a: 80, b: 88 }, { a: 72, b: 84 }], arms });
      const sit = [renderBig(v, sitP([{ a: 20, b: 40 }, { a: 10, b: 30 }])), renderBig(v, sitP([{ a: 25, b: 70, phone: 1 }, { a: 10, b: 30 }]))];
      sit[1] = renderBig(v, Object.assign(sitP([{ a: 25, b: 115 }, { a: 10, b: 30 }]), { phone: 1 }));
      const phone = [renderBig(v, Object.assign(stand([{ a: 40, b: 70 }, { a: 30, b: 60 }]), { phone: 1 })), renderBig(v, Object.assign(stand([{ a: 42, b: 76 }, { a: 30, b: 62 }]), { phone: 1 }))];
      const coffee = [renderBig(v, Object.assign(stand([{ a: 20, b: 80 }, { a: -6, b: 10 }]), { cup: 1 })), renderBig(v, Object.assign(stand([{ a: 35, b: 125 }, { a: -6, b: 10 }]), { cup: 1 }))];
      const stretch = [renderBig(v, Object.assign(stand([{ a: 196, b: -12 }, { a: 205, b: -8 }], -1), { armsBack: 1 })), renderBig(v, Object.assign(stand([{ a: 190, b: -25 }, { a: 200, b: -20 }]), { armsBack: 1 }))];
      const wave = [renderBig(v, stand([{ a: 120, b: 20 }, { a: -6, b: 10 }])), renderBig(v, stand([{ a: 140, b: -10 }, { a: -6, b: 10 }]))];
      return { walk, carry, idle, work, hammer, push, pull, reach, sit, phone, coffee, stretch, wave, S: Object.assign({}, BIG2, { hipY: BIG2.hipY, thigh: 5.5, shin: 5.5, h: 30 }) };
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
  function frontSit(vi) { return FSS[vi] || (FSS[vi] = [frontSitSmall(VAR[vi % VAR.length], 0), frontSitSmall(VAR[vi % VAR.length], 1)]); }
  function frontBig(v, back, k) {   // 12 x 30, k: 0..3 Gehbild, 4 = stehen
    const g = Grid(12, 30), st = k < 4 ? [1, 0, -1, 0][k] : 0;
    if (v.cap) { g.rect(3, 0, 6, 2, v.h2); g.rect(3, 0, 3, 1, v.h1); g.rect(2, 2, 8, 1, 'D'); g.set(5, 1, 'F'); if (!back) g.rect(3, 3, 6, 1, 'a'); }
    else { g.rect(3, 0, 6, 1, v.h1); g.rect(2, 1, 8, 2, v.h2); g.rect(3, 1, 3, 1, v.h1); g.rect(1, 2, 10, 1, v.h2); }   // Helm mit Schirm
    if (back) { g.rect(3, 3, 6, 5, v.hair); g.set(3, 7, '.'); g.set(8, 7, '.'); }
    else {   // rundes Gesicht: Ecken weg, Ohren, Wangen, Kinn
      g.rect(3, v.cap ? 4 : 3, 6, v.cap ? 4 : 5, v.s1); if (!v.cap) { g.set(3, 3, v.hair); g.set(8, 3, v.hair); g.rect(4, 3, 4, 1, v.hair); }
      g.set(3, 7, '.'); g.set(8, 7, '.'); g.set(2, 5, v.s2); g.set(9, 5, v.s2);
      g.set(4, 5, 'a'); g.set(7, 5, 'a'); g.set(4, 6, v.s2); g.set(7, 6, v.s2); g.set(5, 7, v.s2); g.set(6, 7, v.s2); }
    g.rect(5, 8, 2, 1, v.s2);
    for (let y = 9; y < 18; y++) for (let x = 3; x < 9; x++) g.set(x, y, x === 3 ? v.j1 : x >= 8 ? v.j3 : v.j2); if (!back) { g.rect(6, 10, 1, 7, v.j3); } g.rect(3, 17, 6, 1, v.p2); g.set(5, 17, 'E');
    for (const [x, dy] of [[2, Math.max(0, st)], [9, Math.max(0, -st)]]) { g.rect(x, 9 + dy, 1, 7, v.j3); g.set(x, 16 + dy, v.s1); g.set(x, 17 + dy, v.s2); }   // Arme schwingen
    const lL = 11 - (st > 0 ? 2 : 0), lR = 11 - (st < 0 ? 2 : 0);
    g.rect(4, 18, 2, lL, v.p1); g.rect(6, 18, 2, lR, v.p2); g.rect(3, 18 + lL, 3, 1, 'a'); g.rect(6, 18 + lR, 3, 1, 'a');
    return buildSprite(g.rows());
  }
  const FBB = {};
  function frontB(vi, back) { const key = vi + (back ? 'b' : 'f'); return FBB[key] || (FBB[key] = [0, 1, 2, 3, 4].map(k => frontBig(vOf(vi), back, k))); }
  const FB = {};
  function front(vi, back) { const key = vi + (back ? 'b' : 'f'); return FB[key] || (FB[key] = [0, 1, 2, 3, 4].map(k => frontSmall(VAR[vi % VAR.length], back, k))); }
  // fertige Figur mit den Füßen auf Höhe feet zeichnen
  function put(g, s, x, feet, flip) { ART.blit(g, s, x, feet + 1, null, flip); }
  const cache = {};
  function set(size, vi) { const k = size + vi; if (!cache[k]) cache[k] = make(size === 'big' ? BIG : SMALL, vOf(vi)); return cache[k]; }

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
    const sorted = c.slice().sort((p, q) => p.v - q.v);
    for (const a of sorted) {
      const W = set(a.size, a.v), S = W.S;
      let s;
      const stride = a.size === 'big' ? 16 : 7;
      if (!isFinite(a.x)) continue; if (!isFinite(a.dist)) a.dist = 0;   /* nie mit kaputten Werten zeichnen */
      if (a.st === 'walk') s = (a.box ? W.carry : W.walk)[((Math.floor(a.dist / stride * 8) % 8) + 8) % 8];
      else if (a.act === 'work') s = W.work[Math.floor(time * 1.6 + a.v) % 4];
      else if (a.act === 'hammer') { const ph = (time * .9 + a.v * .3) % 1; s = W.hammer[ph < .45 ? 0 : ph < .7 ? 1 : ph < .8 ? 2 : 3]; }
      else if (a.box) s = W.carry[0];
      else if (a.act === 'sit' && a.st === 'act' && a.size === 'small') { ART.blit(g, frontSit(a.v)[Math.floor(time * .25 + a.v) % 3 === 0 ? 1 : 0], Math.round(a.x), base - 3, null, false); continue; }   // auf der Bank: frontal
      else if (a.act === 'sit') s = W.sit[Math.floor(time * .25 + a.v) % 3 === 0 ? 1 : 0];
      else if (a.act === 'phone') s = W.phone[Math.floor(time * .8 + a.v) % 2];
      else if (a.act === 'coffee') s = W.coffee[(time * .4 + a.v * .3) % 1 < .25 ? 1 : 0];
      else if (a.act === 'stretch' || a.act === 'wave') s = W[a.act][Math.floor(time * 2.2 + a.v) % 2];
      else if (a.act === 'pier' || a.act === 'pond') { if (a.st === 'act') continue; s = W.idle[0]; }
      else if (a.act === 'look' && a.st === 'act' && a.size === 'big') {   // geht nach hinten, schaut sich etwas an (Ehrentafel, Brett), kommt zurück
        const sp = c.spots[a.spot] || {}, dep = sp.depth || 10, q = 1 - a.t / (a.tt || 1), up = q < .3, down = q > .7, f = up ? q / .3 : down ? (1 - q) / .3 : 1, d = Math.round(f * dep);
        const F = frontB(a.v, !down), fr = (up || down) ? F[Math.floor(d / 2) % 4] : F[4];
        ART.blit(g, fr, a.x, base - d + 1, null, false); continue; }
      else s = W.idle[Math.floor(time * .7 + a.v) % 2];
      if (!s) continue;
      const flip = (a.st === 'walk' ? a.dir : a.face) < 0;
      const lift = a.act === 'sit' && a.st === 'act' ? (a.size === 'big' ? 4 : 2) : 0;   // sitzt auf Bank oder Kiste
      if (a.size === 'big') put(g, s, a.x, base - lift, flip); else ART.blit(g, s, a.x, base - lift + Math.round(S.h - S.hipY - S.thigh - S.shin), null, flip);
    }
  }
  return { set, crew, step, draw, put, front, frontB, frontSit, VAR, BIG, SMALL, crews };
})();
