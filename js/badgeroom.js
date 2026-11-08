// Ehrenhalle: Raum mit Steintafel, Strahlern von unten und den Plaketten als Pixelbilder
'use strict';
const BADGEROOM = (() => {
  const { R, mk, buildSprite, PAL, rng } = ART;
  const W = 192, H = 246, FL = 232;   /* Tafel 176 x 203: gleiches Verhältnis wie im Pförtnerhaus (66 x 76) */
  const BPAL = Object.assign({}, PAL, { k: '#2a5ec8', K: '#4d8cf0', '8': '#9a5a22', '9': '#d68e30' });
  const BIG = {}, GHOST = {};
  Object.keys(window.BADGE_PIX || {}).forEach(id => {
    const rows = window.BADGE_PIX[id];
    BIG[id] = buildSprite(rows, BPAL);
    // nicht verdient: in den Stein gemeißelte Umrisse
    GHOST[id] = buildSprite(rows.map((r, y) => r.split('').map((c, x) => c === '.' ? '.' : ((x + y) % 7 === 0 ? '2' : '1')).join('')), Object.assign({}, BPAL, { '1': '#3a3542', '2': '#332e3b' }));
  });
  // fester Hintergrund (einmal gezeichnet)
  const bg = mk(W, H), g = bg.getContext('2d');
  ART.onRestore(() => paint());   /* Hintergrund nach Grafikverlust neu zeichnen */
  function paint() {
    const r = rng(21);
    R(g, 0, 0, W, H, '#1d1826');
    for (let y = 0; y < FL; y += 12) for (let x = -((y / 12) % 2) * 14; x < W; x += 28) { const c = ['#2a2433', '#2e2838', '#262030'][Math.floor(r() * 3)]; R(g, x + 1, y + 1, 26, 10, c); R(g, x + 1, y + 1, 26, 1, '#352e40'); }
    // Tafel: gleiche Steinplatte wie im Pförtnerhaus – Sprenkel, oben links heller, Fase hell oben/links und dunkel rechts/unten,
    // gemeißelter Innenrahmen, feine Adern, Messingschild mit Schrauben, zweistufiger Sockel
    const tx = 8, ty = 8, tw = 176, th = 203, C = { U: '#2a2440', g: '#4a4652', h: '#6b6672', i: '#8f8a92', j: '#b5afb0' };
    R(g, tx, ty, tw, th, C.h); for (let i = 0; i < 160; i++) R(g, tx + 6 + r() * (tw - 12), ty + 6 + r() * (th - 12), 1, 1, r() < .5 ? '#625d69' : '#736e7a');   // ruhiger Stein, nur leicht getönt
    R(g, tx, ty, tw, 2, C.j); R(g, tx, ty + 2, tw, 2, C.i); R(g, tx, ty, 2, th, C.j); R(g, tx + 2, ty, 2, th, C.i);
    R(g, tx + tw - 4, ty, 2, th, C.g); R(g, tx + tw - 2, ty, 2, th, C.U); R(g, tx, ty + th - 2, tw, 2, C.U);
    R(g, tx + 8, ty + 8, tw - 16, 2, C.g); R(g, tx + 8, ty + 8, 2, th - 16, C.g); R(g, tx + 8, ty + th - 10, tw - 16, 2, C.j); R(g, tx + tw - 10, ty + 8, 2, th - 16, C.j);   // gemeißelter Rahmen
    for (const [x0, y0, n] of [[30, 34, 14], [150, 46, 10], [60, 140, 12], [128, 152, 16], [96, 22, 8], [24, 176, 10]]) { let x = tx + x0, y = ty + y0; for (let s2 = 0; s2 < n; s2++) { R(g, x, y, 1, 1, C.g); x += r() < .45 ? (r() < .5 ? 1 : -1) : 0; y++; } }   // ein paar Risse
    // Messingschild mit Fase und Schrauben
    R(g, 54, ty + 11, 84, 14, '#3e2731'); R(g, 55, ty + 12, 82, 12, '#c07a2a'); R(g, 55, ty + 12, 82, 2, '#f7d86a'); R(g, 55, ty + 12, 2, 12, '#e8a83a'); R(g, 55, ty + 22, 82, 2, '#7a4a1c'); R(g, 135, ty + 12, 2, 12, '#7a4a1c');
    for (const bx of [59, 131]) { R(g, bx, ty + 16, 2, 2, '#d8d2cc'); R(g, bx + 1, ty + 17, 1, 1, '#6b6672'); }
    // zweistufiger Sockel
    R(g, tx + 14, ty + th, tw - 28, 6, C.h); R(g, tx + 14, ty + th, tw - 28, 2, C.j); R(g, tx + 14, ty + th + 5, tw - 28, 1, C.g);
    // Boden
    R(g, 0, FL, W, H - FL, '#2a2433'); R(g, 0, FL, W, 1, '#4a4652'); for (let x = 0; x < W; x += 24) R(g, x, FL + 1, 1, H - FL, '#231e2c');
    R(g, 4, FL - 12, 184, 12, C.h); R(g, 4, FL - 12, 184, 2, C.j); R(g, 4, FL - 2, 184, 2, C.g); for (let x = 4; x < 188; x++) if (r() < .06) R(g, x, FL - 9 + Math.floor(r() * 6), 1, 1, C.i);   // Sockel unten
  }
  paint();
  const ttl = mk(80, 10); // Schrift auf dem Schild wird im Spiel mit der Pixelschrift gesetzt
  const SPOTS = [[30, 1], [162, -1]];
  const SPOT = INNER.SPOT;   // derselbe Strahler wie im Pförtnerhaus
  const motes = Array.from({ length: 40 }, (_, i) => ({ x: Math.random() * W, y: 30 + Math.random() * 150, s: .5 + Math.random(), p: Math.random() * 7 }));
  let HITS = [];
  const tmp = mk(64, 64), tg = tmp.getContext('2d');
  function layout(list) {
    const pos = [];
    list.forEach((b, i) => { const r = Math.floor(i / 3), c = i % 3, last = r === Math.floor((list.length - 1) / 3), n = last ? list.length - r * 3 : 3; pos.push({ b, x: 96 + (c - (n - 1) / 2) * 52, y: 64 + r * 56 });   /* passt zwischen die Ränder */ });
    return pos;
  }
  function draw(ctx, list, time, hover, titleFn) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, 0, 0);
    if (titleFn) titleFn(ctx);
    HITS = [];
    const okI = list.map((b, i) => b.ok && b.a >= 1 ? i : -1).filter(i => i >= 0), slot = Math.floor(time / 6), shineI = okI.length ? okI[(slot * 7 + 3) % okI.length] : -1;   /* immer nur ein Badge glänzt, alle 6 s ein anderes */
    layout(list).forEach(({ b, x, y }, i) => {
      const s = (b.ok ? BIG : GHOST)[b.id]; if (!s) return;
      const lift = b.ok && hover === i ? -1 : 0;
      // Haken an der Tafel
      if (b.ok && b.a < 1) { const gs = GHOST[b.id]; if (gs) ctx.drawImage(gs.c, Math.round(x - gs.c.width / 2), Math.round(y - gs.c.height / 2)); ctx.globalAlpha = b.a * b.a; }   /* neues Badge blendet langsam ein */
      ctx.drawImage(s.c, Math.round(x - s.c.width / 2), Math.round(y - s.c.height / 2) + lift); ctx.globalAlpha = 1;
      if (b.ok && i === shineI) {
        // Lichtreflex: huscht selten und schnell schräg über die Plakette
        const ph = (time % 6) / .4;
        if (ph < 1) {
          tg.clearRect(0, 0, 64, 64); tg.globalCompositeOperation = 'source-over'; tg.drawImage(s.c, 0, 0); tg.globalCompositeOperation = 'source-atop';
          const pos = Math.round(ph * (s.c.width + s.c.height)) - 8;
          for (let y = 0; y < s.c.height; y++) { const x = pos - y; tg.globalAlpha = .55; R(tg, x, y, 2, 1, '#fffaf0'); tg.globalAlpha = .25; R(tg, x + 3, y, 1, 1, '#fffaf0'); }
          tg.globalAlpha = 1; ctx.drawImage(tmp, Math.round(x - s.c.width / 2), Math.round(y - s.c.height / 2) + lift);
        }
      } else if (!b.ok) {
        ctx.fillStyle = '#b5afb0'; ctx.font = '600 12px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillText('?', x, y + 5);
      }
      HITS.push({ i, x: x - 24, y: y - 24, w: 48, h: 48 });
      if (hover === i) { ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 1; ctx.strokeRect(x - 25.5, y - 25.5, 51, 51); }
    });
    // Strahler und Lichtkegel nach oben
    SPOTS.forEach(([sx, dir], i) => {
      ctx.drawImage(dir > 0 ? SPOT.c : SPOT.f, sx - 4, FL - 11);
      const flick = .94 + .06 * Math.sin(time * 2.3 + i), len = 185;
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 1; j < len; j++) {
        const t = j / len, fall = Math.pow(1 - t, 1.05), w = 4 + j * 1.05, cx = sx + dir * j * .3;
        [[1, .03], [.6, .04], [.3, .05]].forEach(([f, a]) => { ctx.globalAlpha = a * fall * flick; const ww = Math.max(1, Math.round(w * f)); R(ctx, Math.round(cx - ww / 2), FL - 9 - j, ww, 1, '#ffcf8a'); });
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      R(ctx, sx - 1, FL - 7, 3, 1, '#fff3c0');
    });
    // Staub im Licht
    for (const m of motes) { const x = (m.x + Math.sin(time * .2 * m.s + m.p) * 8 + W) % W, y = 20 + ((m.y - time * 2 * m.s) % 170 + 170) % 170; const near = Math.min(...SPOTS.map(([s, d]) => Math.abs(s + d * (FL - y) * .3 - x))); const a = Math.max(0, 1 - near / 40) * .5; if (a > .03) { ctx.globalAlpha = a; R(ctx, x, y, 1, 1, '#fff6e0'); } }
    ctx.globalAlpha = 1;
  }
  function hit(x, y) { const h = HITS.find(h => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h); return h ? h.i : -1; }
  void ttl;
  return { draw, hit, W, H };
})();
