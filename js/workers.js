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
  function frontSit(vi) { return FSS[vi] || (FSS[vi] = [frontSitSmall(VAR[vi % VAR.length], 0), frontSitSmall(VAR[vi % VAR.length], 1)]); }
  const FBB = {};
  function frontB(vi, back) { const key = vi + (back ? 'b' : 'f'); return FBB[key] || (FBB[key] = [0, 1, 2, 3, 4, 5, 6].map(k => chFront(vOf(vi), back, k))); }   // v150: 6 Gehbilder, [6] = stehen
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
      if (a.size === 'big') put(g, s, a.x, base - lift, flip); else ART.blit(g, s, a.x, base - lift + Math.round(S.h - S.hipY - S.thigh - S.shin), null, flip);
    }
  }
  return { set, crew, step, draw, put, front, frontB, frontSit, VAR, BIG, SMALL, crews, chFront, MEISTER, tak };
})();
