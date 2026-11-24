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
