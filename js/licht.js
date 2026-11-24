// Licht (v154): das in pxl abgestimmte Licht (tools/licht/*.px.js), hier zur Laufzeit gerechnet – keine zusätzlichen Bilder.
// Verfahren wie pxl lighting({ cell: 2, smooth: true }): jede Lampe breitet sich über ein Raster aus 2x2-Pixel-Zellen aus
// (linear nach Reichweite r, weich ausgeblendet), alle Lampen und das Umgebungslicht werden per Maximum vereint,
// das Ergebnis multipliziert die Farben (Werte über 1 hellen auf). Danach glow(): Schein um leuchtende Pixel (Screen).
// Je Raum vier abgestimmte Tageszeiten (Morgen, Tag, Abend, Nacht); dazwischen wird fließend überblendet.
'use strict';
const LICHT = (() => {
  const CELL = 2, ZK = [['morgen', .22], ['tag', .45], ['abend', .765], ['nacht', .95]];
  const rgbOf = (c, k = 1) => [parseInt(c.slice(1, 3), 16) / 255 * k, parseInt(c.slice(3, 5), 16) / 255 * k, parseInt(c.slice(5, 7), 16) / 255 * k];

  // ---------- Bausteine wie in tools/licht/kegel.px.js ----------
  function KEGEL(c, x, y, lang, z, farbe, o = {}) {   // Lichtkegel: dicht gereihte Lichtpunkte, nach unten breiter und schwächer
    const k = o.staerke !== undefined ? o.staerke : z.kegel; if (!k) return;
    const b = o.breite || 0, ddy = o.dy === undefined ? 1 : o.dy, dl = Math.hypot(o.dx || 0, ddy), dx = (o.dx || 0) / dl, dy = ddy / dl;
    const n = Math.max(8, Math.round(lang / 5)), sp = b ? Math.round(b / 3) + 1 : 1, w = o.wachsen === undefined ? .45 : o.wachsen;
    for (let s = 0; s < sp; s++) { const off = sp === 1 ? 0 : -b / 2 + b * s / (sp - 1);
      for (let i = 1; i <= n; i++) { const f = i / n; c.lamp(Math.round(x + off + dx * lang * f), Math.round(y + dy * lang * f), { r: Math.round(14 + lang * w * f), color: farbe, power: k * (1.55 - .45 * f) }); } }
  }
  const RUND = (r, z) => Math.round(r * (1 - (z.rund || 0)));
  const STRAHLER = { morgen: .5, tag: .28, abend: .55, nacht: 1 }, SF = '#ffdcaa';
  const ZEITEN = {
    morgen: { fenster: ['#ffd8c4', .85], lampen: .9, klein: .8, schein: .45, ambient: .38, raum: .9, warm: '#ffe0a8', kegel: 0 },
    tag: { fenster: ['#f6efe0', .95], lampen: 1, klein: .8, schein: .45, ambient: .38, raum: 1, warm: '#ffe0a8', kegel: 0 },
    abend: { fenster: ['#ffb27a', .75], lampen: 1.1, klein: .9, schein: .6, ambient: .36, raum: .7, warm: '#ffcc80', kegel: .65, rund: .2 },
    nacht: { fenster: ['#9fb2ff', .3], lampen: 1.35, klein: 1.1, schein: .85, ambient: .28, raum: .3, warm: '#ffc070', kegel: 1, rund: .45 },
  };
  const PF = {   // Pförtnerhaus: eigene Tabelle (zuerst abgestimmt)
    morgen: Object.assign({}, ZEITEN.morgen, { fenster: ['#ffd8c4', .85, 200] }),
    tag: Object.assign({}, ZEITEN.tag, { fenster: ['#f6efe0', .95, 220] }),
    abend: Object.assign({}, ZEITEN.abend, { fenster: ['#ffb27a', .75, 190] }),
    nacht: Object.assign({}, ZEITEN.nacht, { fenster: ['#9fb2ff', .3, 120], ambient: .31, raum: .75 }),
  };
  const AMB = '#9aa6c8';
  // Raum: (zeit, info) -> { amb, ambC, lamps(c), glow: [{ pts | rects | hell, r, s, where }] }
  const RAEUME = {
    pfoertner: (zt, info = {}) => { const z = PF[zt], SB = STRAHLER[zt], WARM = z.warm, LA = !!info.lampeAus; return { amb: z.ambient, ambC: AMB,   /* v160: lampeAus = Stehlampe in der Leseecke ausgeknipst */
      lamps: c => {
        c.lamp(64, 57, { r: RUND(240, z), color: WARM, power: z.lampen }); c.lamp(292, 57, { r: RUND(220, z), color: WARM, power: z.lampen });
        KEGEL(c, 64, 58, 100, z, WARM, { breite: 12 }); KEGEL(c, 292, 58, 110, z, WARM, { breite: 12 });
        c.lamp(133, 84, { r: z.fenster[2], color: z.fenster[0], power: z.fenster[1] });
        c.lamp(192, 120, { r: 700, color: '#f3e7d3', power: .45 * z.lampen * z.raum });
        for (const x of [133, 159]) c.lamp(x, 141, { r: 40, color: '#9cc8ff', power: .95 * z.klein });
        if (!LA) c.lamp(27, 142, { r: 40, color: '#ffd08a', power: .75 * z.klein });
        for (const x of [198, 259]) c.lamp(x, 150, { r: 22, color: SF, power: 1.1 * SB });
        KEGEL(c, 199, 148, 58, z, SF, { dx: .45, dy: -1, wachsen: .5, staerke: .9 * SB }); KEGEL(c, 258, 148, 58, z, SF, { dx: -.45, dy: -1, wachsen: .5, staerke: .9 * SB });
      },
      glow: [{ pts: [[62, 55], [64, 55], [66, 55], [290, 55], [292, 55]], r: 7, s: z.schein, where: [55, 48, 250, 12] },
        { pts: [[197, 150], [198, 150], [259, 150], [260, 150]], r: 6, s: .85 * SB, where: [190, 144, 78, 12] },
        { pts: [[126, 139], [152, 139], [152, 141]], r: 3, s: .5, where: [124, 137, 44, 10] },
        { pts: LA ? [] : [[24, 138], [25, 138], [28, 138], [24, 145], [26, 145]], r: 6, s: z.schein * .7, where: [20, 134, 16, 10] },
        { hell: (r, g, b) => g > 170 && g > b + 50, r: 4, s: .5, where: [328, 146, 22, 16] }] }; },
    blechwerkstatt: (zt) => { const z = ZEITEN[zt]; return { amb: z.ambient, ambC: AMB,
      lamps: c => {
        c.lamp(192, 140, { r: 700, color: '#f3e7d3', power: .55 * z.lampen * z.raum });
        for (const x of [73, 149, 225, 301]) c.lamp(x, 59, { r: RUND(200, z), color: z.warm, power: z.lampen });
        for (const x of [35, 111, 187, 264, 339]) c.lamp(x, 70, { r: 240, color: z.fenster[0], power: z.fenster[1] * 1.1 });
        for (const x of [73, 149, 225, 301]) KEGEL(c, x, 60, 75, z, z.warm);
      },
      glow: [{ pts: [[70, 57], [73, 57], [146, 57], [149, 57], [222, 57], [298, 57]], r: 7, s: z.schein, where: [60, 52, 250, 10] },
        { pts: [[142, 145], [143, 144]], r: 3, s: .4, where: [138, 140, 12, 12] }] }; },
    maschinenhalle: (zt) => { const z = ZEITEN[zt]; return { amb: z.ambient, ambC: AMB,
      lamps: c => {
        c.lamp(192, 165, { r: 700, color: '#f3e7d3', power: .6 * z.lampen * z.raum });
        for (const x of [54, 150, 246, 342]) c.lamp(x, 27, { r: RUND(230, z), color: z.warm, power: z.lampen });
        for (const x of [30, 78, 126, 174, 222, 270, 318, 366]) c.lamp(x, 46, { r: 200, color: z.fenster[0], power: z.fenster[1] });
        c.lamp(190, 104, { r: 40, color: '#ffc070', power: .55 * z.klein });
        for (const x of [54, 150, 246, 342]) KEGEL(c, x, 28, 140, z, z.warm);
      },
      glow: [{ pts: [[50, 25], [54, 25], [146, 25], [242, 25], [338, 25]], r: 7, s: z.schein, where: [40, 20, 320, 10] },
        { pts: [[172, 94], [171, 95]], r: 4, s: .45 + .2 * z.klein, where: [158, 88, 66, 34] },
        { pts: [[164, 104], [164, 105]], r: 3, s: .5, where: [160, 100, 8, 20] },
        { pts: [[8, 97]], r: 3, s: .5, where: [4, 94, 6, 6] }] }; },
    prueflabor: (zt) => { const z = ZEITEN[zt]; return { amb: z.ambient, ambC: AMB,
      lamps: c => {
        c.lamp(192, 165, { r: 700, color: '#e4e9f2', power: .6 * z.lampen * z.raum });
        for (const x of [60, 156, 252, 348]) c.lamp(x, 21, { r: RUND(320, z), color: '#cfe0ff', power: z.lampen });
        for (const x of [39, 115, 191, 267, 343]) c.lamp(x, 64, { r: 320, color: z.fenster[0], power: z.fenster[1] * .85 });
        for (const x of [60, 156, 252, 348]) KEGEL(c, x, 22, 140, z, '#cfe0ff', { breite: 30 });
      },
      glow: [{ pts: [[60, 17], [60, 18]], r: 4, s: z.schein * .7, where: [30, 16, 340, 4] },
        { pts: [[221, 58]], r: 3, s: .5, where: [216, 54, 26, 20] },
        { pts: [[218, 140], [217, 139]], r: 3, s: .45, where: [213, 135, 22, 10] }] }; },
    kraftwerk: (zt) => { const z = ZEITEN[zt], SB = STRAHLER[zt]; return { amb: z.ambient, ambC: AMB,
      lamps: c => {
        c.lamp(192, 150, { r: 700, color: '#f3e7d3', power: .55 * z.lampen * z.raum });
        for (const x of [48, 144, 240]) c.lamp(x, 51, { r: RUND(210, z), color: z.warm, power: z.lampen });
        for (const x of [48, 144, 240]) KEGEL(c, x, 52, 120, z, z.warm, { breite: 8 });
        for (const x of [25, 71, 121, 167, 217]) c.lamp(x, 62, { r: 220, color: z.fenster[0], power: z.fenster[1] });
        c.lamp(206, 152, { r: 40, color: '#ffb860', power: 1.15 * z.klein }); c.lamp(224, 152, { r: 40, color: '#a8f080', power: 1.15 * z.klein }); c.lamp(242, 152, { r: 40, color: '#a8d8ff', power: 1.15 * z.klein });
        for (const [x, d] of [[274, 1], [373, -1]]) { c.lamp(x, 177, { r: 24, color: SF, power: 1.2 * SB }); KEGEL(c, x, 175, 130, z, SF, { dx: .42 * d, dy: -1, breite: 10, wachsen: .85, staerke: 1.05 * SB }); }
        c.lamp(86, 139, { r: 24, color: '#ffb060', power: .8 * z.klein });
      },
      glow: [{ pts: [[46, 49], [48, 49]], r: 7, s: z.schein, where: [40, 46, 210, 6] },
        { pts: [[200, 144], [201, 144], [202, 144], [206, 145], [207, 145], [208, 145], [219, 150], [222, 150], [223, 151], [238, 150], [241, 150]], r: 5, s: .4 + .3 * z.klein, where: [198, 138, 52, 32] },
        { pts: [[273, 177], [274, 177], [373, 177], [374, 177]], r: 6, s: .85 * SB, where: [264, 172, 118, 10] },
        { pts: [[80, 138], [83, 138]], r: 4, s: .45, where: [74, 134, 26, 8] },
        { pts: [[140, 155], [145, 156], [151, 155]], r: 3, s: .5, where: [136, 152, 18, 8] }] }; },
    // Werkshof: Sonne mit Richtung, ab Abend Laternen (Kegel), Fenster, Lämpchen. info.L = Lichtliste aus scene.js
    hof: (zt, info) => { const z = HOF[zt], W8 = '#ffd890', L = info.L || []; return { amb: z.ambient, ambC: z.amb,
      lamps: c => {
        const [sx, sy, sc, sp, sr] = z.sonne; c.lamp(sx, sy, { r: sr, color: sc, power: sp });
        if (!z.lampen) return;
        for (const l of L) { if (l.move || l.hinten) continue; const cx = Math.round(l.x + l.w / 2), cy = Math.round(l.y + l.h / 2);
          if (l.pool) { c.lamp(cx, cy, { r: 14, color: W8, power: .9 * z.lampen }); KEGEL(c, cx, cy + 1, 18, { kegel: z.kegel * .7 }, W8, { breite: 4, wachsen: .6 }); }
          else if (l.fire) c.lamp(cx, cy, { r: 16, color: l.c || W8, power: .9 * z.lampen * (l.a === undefined ? 1 : l.a) });
          else if (z.fenster) c.lamp(cx, cy, { r: 9, color: W8, power: .85 * z.fenster }); }
      },
      glow: [{ rects: L.filter(l => !l.fire && !l.pool).map(l => [l.x, l.y, l.w, l.h]), r: 4, s: .45 * z.fenster },
        { rects: z.lampen ? L.filter(l => (l.fire || l.pool) && !l.move && !l.hinten).map(l => [l.x, l.y, l.w, l.h]) : [], r: 6, s: .4 + .35 * z.lampen / 1.35 }],
      fenster: z.fenster }; },
    // Leitraum (Leitstand): Bogenfenster, Schein der Tafel, Wandleuchten unter den Fensterbänken. info.lay = Aufteilung, info.W/H
    leitraum: (zt, info) => { const z = LR[zt], { lay } = info, t = lay.tafel, LE = lay.fenster.map(f => [Math.round(f.x + f.w / 2), Math.round(f.y + f.h + 9)]); return { amb: z.ambient, ambC: '#a8a0c0',
      lamps: c => {
        for (const f of lay.fenster) for (const q of [.21, .56, .9]) c.lamp(Math.round(f.x + f.w / 2), Math.round(f.y + f.h * q), { r: 120, color: z.fenster[0], power: z.fenster[1] });
        for (const [x, y] of [[t.x + t.w / 2, t.y + t.h / 2], [t.x + 15, t.y + t.h / 2], [t.x + t.w - 15, t.y + t.h / 2], [t.x + t.w / 2, t.y + t.h + 3]]) c.lamp(Math.round(x), Math.round(y), { r: 150, color: '#8fe0b8', power: z.tafel });
        for (const [x, y] of LE) { c.lamp(x, y, { r: 26, color: '#ffd890', power: z.leuchte }); KEGEL(c, x, y + 1, 50, z, '#ffd890', { breite: 6, wachsen: .7 }); }
        c.lamp(13, lay.band.y - 4, { r: 18, color: '#9cff7a', power: .7 });
      },
      glow: [{ rects: LE.map(([x, y]) => [x - 1, y, 3, 1]), r: 5, s: .25 + .45 * z.leuchte / 1.3 }] }; },
    // Ehrenhalle: immer wie nachts (Wunsch). Zwei Bodenstrahler leuchten schräg hinauf auf die Tafel.
    ehrenhalle: () => { const SB = 1; return { amb: .38, ambC: AMB,
      lamps: c => {
        c.lamp(96, 150, { r: 500, color: '#eeeef4', power: .35 + .55 * .3 });
        for (const [x, d] of [[30, 1], [162, -1]]) { c.lamp(x, 225, { r: 22, color: SF, power: 1.1 * SB }); KEGEL(c, x, 224, 200, {}, SF, { dx: .3 * d, dy: -1, breite: 6, wachsen: .5, staerke: .95 * SB }); }
      },
      glow: [{ pts: [[30, 225], [162, 225]], r: 6, s: .85 * SB, where: [20, 220, 152, 10] }] }; },
  };
  const HOF = {
    morgen: { sonne: [95, 70, '#ffd4b0', 1.15, 700], ambient: .68, amb: '#b8a8c8', lampen: .6, fenster: .35, kegel: 0 },
    tag: { sonne: [175, 12, '#fff6e6', 1.2, 900], ambient: .85, amb: '#c8d0e0', lampen: 0, fenster: 0, kegel: 0 },
    abend: { sonne: [430, 95, '#ffa878', 1.15, 650], ambient: .66, amb: '#b09ab8', lampen: 1, fenster: .7, kegel: .65 },
    nacht: { sonne: [150, 27, '#9fb2ff', .55, 600], ambient: .34, amb: '#8a96c0', lampen: 1.35, fenster: 1, kegel: 1 },
  };
  const LR = {
    morgen: { fenster: ['#ffc8b0', 1], ambient: .7, tafel: .5, leuchte: .6, kegel: 0 },
    tag: { fenster: ['#e8f2ff', 1.15], ambient: .82, tafel: .4, leuchte: .4, kegel: 0 },
    abend: { fenster: ['#ff9a70', .95], ambient: .6, tafel: .6, leuchte: 1, kegel: .65 },
    nacht: { fenster: ['#7f90d8', .45], ambient: .42, tafel: .75, leuchte: 1.3, kegel: 1 },
  };

  // ---------- Lichtfeld einer Tageszeit ----------
  function feld(W, H, cfg) {
    const gw = Math.ceil(W / CELL), gh = Math.ceil(H / CELL), n = gw * gh, L = new Float32Array(n * 3), a = rgbOf(cfg.ambC, cfg.amb);
    for (let i = 0; i < n; i++) { L[i * 3] = a[0]; L[i * 3 + 1] = a[1]; L[i * 3 + 2] = a[2]; }
    const D = Math.SQRT2 - 1;
    cfg.lamps({ lamp: (x, y, o) => {
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); if (cx < 0 || cy < 0 || cx >= gw || cy >= gh) return;   /* wie pxl: Lampen außerhalb des Bildes fallen weg */
      const p = o.power, air = CELL / o.r, reach = Math.ceil(p / air), c = rgbOf(o.color);
      const x0 = Math.max(0, cx - reach), x1 = Math.min(gw - 1, cx + reach), y0 = Math.max(0, cy - reach), y1 = Math.min(gh - 1, cy + reach);
      for (let yy = y0; yy <= y1; yy++) { const dy = Math.abs(yy - cy);
        for (let xx = x0; xx <= x1; xx++) { const dx = Math.abs(xx - cx), d = dx > dy ? dx + D * dy : dy + D * dx, f = p - air * d;
          if (f <= .02 && (dx || dy)) continue;
          const v = f >= 1 ? f : 1 - (1 - f) * (1 - f), i = (yy * gw + xx) * 3;
          if (v * c[0] > L[i]) L[i] = v * c[0]; if (v * c[1] > L[i + 1]) L[i + 1] = v * c[1]; if (v * c[2] > L[i + 2]) L[i + 2] = v * c[2]; } }
    } });
    return { gw, gh, L };
  }
  function zeitGewicht(t) {   // zwischen welchen beiden Tageszeiten, und wie weit
    for (let i = 0; i < 4; i++) { const [a, ta] = ZK[i], [b, tb0] = ZK[(i + 1) % 4], tb = tb0 < ta ? tb0 + 1 : tb0, tt = t < ta && i === 3 ? t + 1 : t;
      if (tt >= ta && tt < tb) { let f = (tt - ta) / (tb - ta); f = f * f * (3 - 2 * f); return [a, b, f]; } }
    return ['nacht', 'morgen', ((t + 1 - .95) / .27)];
  }

  // ---------- Anwenden ----------
  const ST = {};   // je Raum: Felder, Lichtkarte, Schein
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function apply(g, W, H, raum, t, info = {}, opt = {}) {
    const R = RAEUME[raum]; if (!R) return;
    const s = ST[raum] || (ST[raum] = { F: {}, sig: '', t: -9, halo: 0 }), now = performance.now();
    const sig = W + 'x' + H + '|' + (info.fest ? '' : (info.sig || ''));   /* fest: Varianten (z. B. Lampe aus) bekommen eigene Felder statt eines Neuaufbaus */
    if (sig !== s.sig && (!s.sig || now - (s.sigT || 0) > 3000 || W + 'x' + H !== s.wh)) { s.sig = sig; s.sigT = now; s.wh = W + 'x' + H; s.F = {}; s.t = -9; s.halo = 0; }
    const [a, b, f] = raum === 'ehrenhalle' ? ['nacht', 'nacht', 0] : zeitGewicht(t);
    const vk = info.fest ? (info.sig || '') + ':' : '', F = z => s.F[vk + z] || (s.F[vk + z] = feld(W, H, R(z, info)));
    const fa = F(a), fb = F(b), gw = fa.gw, gh = fa.gh;
    if (!s.map || s.map.width !== gw || s.map.height !== gh) { s.map = mk(gw, gh); s.mg = s.map.getContext('2d'); s.id = s.mg.createImageData(gw, gh); s.t = -9; }
    if (Math.abs(t - s.t) > .0015 || s.ab !== a + b + vk) { s.t = t; s.ab = a + b + vk;   /* Lichtkarte nur neu mischen, wenn sich die Tageszeit merklich geändert hat */
      const d = s.id.data, A = fa.L, B = fb.L;
      for (let i = 0, j = 0; i < A.length; i += 3, j += 4) { d[j] = (A[i] + (B[i] - A[i]) * f) * 127.5; d[j + 1] = (A[i + 1] + (B[i + 1] - A[i + 1]) * f) * 127.5; d[j + 2] = (A[i + 2] + (B[i + 2] - A[i + 2]) * f) * 127.5; d[j + 3] = 255; }
      s.mg.putImageData(s.id, 0, 0); }
    // Schein (glow) aus den Farben vor dem Licht: etwa einmal je Sekunde neu
    const cfgNow = f < .5 ? R(a, info) : R(b, info);
    if (now - s.halo > 1000 || s.vk !== vk) { s.halo = now; s.vk = vk; s.hc = schein(g, W, H, cfgNow.glow, f < .5 ? 1 : 1); }
    if (opt.vorher) opt.vorher(cfgNow, f, a, b);
    // Multiplizieren: Kopie * (Karte/2), dann doppelt addieren = Kopie * Karte (bis 2-fach aufhellen)
    if (!s.w || s.w.width !== W || s.w.height !== H) { s.w = mk(W, H); s.wg = s.w.getContext('2d'); }
    const wg = s.wg;
    wg.globalCompositeOperation = 'copy'; wg.imageSmoothingEnabled = false; wg.drawImage(g.canvas, 0, 0);
    let karte = s.map, kw = gw * CELL, kh = gh * CELL;
    const ex = raum === 'hof' && info.L && info.L.some(l => l.move || l.hinten) ? extraLampen(info.L, HOF[a], HOF[b], f) : null;
    if (ex && (ex.v.length || ex.h.length)) {
      if (!s.fl || s.fl.width !== W || s.fl.height !== H) { s.fl = mk(W, H); s.flg = s.fl.getContext('2d'); s.ex = mk(W, H); s.exg = s.ex.getContext('2d'); }
      const fg = s.flg, eg = s.exg; fg.globalCompositeOperation = 'copy'; fg.imageSmoothingEnabled = true; fg.drawImage(s.map, 0, 0, kw, kh); fg.globalCompositeOperation = 'lighten';
      for (const [arr, hint] of [[ex.v, false], [ex.h, true]]) { if (!arr.length) continue;
        eg.globalCompositeOperation = 'copy'; eg.fillStyle = '#000'; eg.fillRect(0, 0, W, H); eg.globalCompositeOperation = 'lighten';
        for (const [x, y, o] of arr) lampeMalen(eg, x, y, o);
        if (hint && opt.fronts) { eg.globalCompositeOperation = 'destination-out'; for (const fr of opt.fronts) eg.drawImage(fr.c, fr.x, fr.y); }
        fg.drawImage(s.ex, 0, 0); }
      fg.globalCompositeOperation = 'source-over'; karte = s.fl; kw = W; kh = H; }
    wg.globalCompositeOperation = 'multiply'; wg.imageSmoothingEnabled = karte === s.map; wg.drawImage(karte, 0, 0, kw, kh);
    wg.globalCompositeOperation = 'destination-in'; wg.imageSmoothingEnabled = false; wg.drawImage(opt.mask || g.canvas, 0, 0);
    if (opt.mask) { wg.globalCompositeOperation = 'destination-in'; wg.drawImage(g.canvas, 0, 0); }
    wg.globalCompositeOperation = 'source-over';
    g.save(); g.imageSmoothingEnabled = false;
    if (opt.mask) { g.globalCompositeOperation = 'destination-out'; g.drawImage(opt.mask, 0, 0); g.globalCompositeOperation = 'lighter'; }
    else g.globalCompositeOperation = 'copy';
    g.drawImage(s.w, 0, 0); g.globalCompositeOperation = 'lighter'; g.drawImage(s.w, 0, 0);
    if (s.hc) { g.globalCompositeOperation = 'screen'; g.drawImage(s.hc, 0, 0); }
    if (ex && ex.g && ex.g.length) {   /* Schein der bewegten bzw. verdeckten Lampen in jedem Bild */
      if (!s.gl || s.gl.width !== W || s.gl.height !== H) { s.gl = mk(W, H); s.glg = s.gl.getContext('2d'); }
      const q = s.glg, st = .4 + .35 * ex.lam / 1.35; q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, W, H);
      for (const pass of [true, false]) { for (const l of ex.g) { if (!!l.hinten !== pass || !isFinite(l.x + l.y + l.w + l.h)) continue; const cx = l.x + l.w / 2, cy = l.y + l.h / 2,   /* v159: ungültige Lampen überspringen */ c = rgbOf(l.c || '#ffd56a', 255).map(v => v | 0), gr = q.createRadialGradient(cx, cy, 0, cx, cy, 7);
          gr.addColorStop(0, `rgba(${c},${Math.min(1, st)})`); gr.addColorStop(.5, `rgba(${c},${st * .25})`); gr.addColorStop(1, `rgba(${c},0)`); q.fillStyle = gr; q.fillRect(cx - 7, cy - 7, 14, 14); }
        if (pass && opt.fronts) { q.globalCompositeOperation = 'destination-out'; for (const fr of opt.fronts) q.drawImage(fr.c, fr.x, fr.y); q.globalCompositeOperation = 'source-over'; } }
      g.globalCompositeOperation = 'screen'; g.drawImage(s.gl, 0, 0); }
    g.restore();
  }
  // Schein wie pxl glow(): Quellpixel (Farben an den Punkten, Rechtecke oder hell()) in where; Halo (1 - d/(r+1))^2 in der Quellfarbe, Screen mit Stärke s
  function schein(g, W, H, specs, k) {
    if (!specs || !specs.some(sp => sp.s > .01)) return null;
    const img = g.getImageData(0, 0, W, H).data, acc = new Float32Array(W * H * 3), src = new Uint8Array(W * H); let any = false;
    for (const sp of specs) { if (!(sp.s > .01)) continue;
      const keys = new Set((sp.pts || []).map(([x, y]) => { const i = (y * W + x) * 4; return img[i + 3] ? (img[i] << 16 | img[i + 1] << 8 | img[i + 2]) : -1; }));
      const rects = sp.rects || [sp.where || [0, 0, W, H]], r = sp.r, Rr = Math.ceil(r), w = new Float32Array(W * H), cr = new Float32Array(W * H * 3);
      for (const [rx, ry, rw, rh] of rects) for (let y = Math.max(0, ry); y < Math.min(H, ry + rh); y++) for (let x = Math.max(0, rx); x < Math.min(W, rx + rw); x++) {
        const i = y * W + x, p = i * 4; if (!img[p + 3]) continue;
        const ok = sp.pts ? keys.has(img[p] << 16 | img[p + 1] << 8 | img[p + 2]) : sp.hell ? sp.hell(img[p], img[p + 1], img[p + 2]) : true; if (!ok) continue;
        src[i] = 1; any = true;
        for (let yy = Math.max(0, y - Rr); yy <= Math.min(H - 1, y + Rr); yy++) for (let xx = Math.max(0, x - Rr); xx <= Math.min(W - 1, x + Rr); xx++) {
          const d = Math.hypot(xx - x, yy - y); if (d > r) continue; const ff = (1 - d / (r + 1)) ** 2, j = yy * W + xx;
          if (ff > w[j]) w[j] = ff; cr[j * 3] = Math.max(cr[j * 3], ff * img[p]); cr[j * 3 + 1] = Math.max(cr[j * 3 + 1], ff * img[p + 1]); cr[j * 3 + 2] = Math.max(cr[j * 3 + 2], ff * img[p + 2]); } }
      for (let j = 0; j < W * H; j++) if (w[j]) for (let q = 0; q < 3; q++) { const v = Math.min(1, cr[j * 3 + q] * sp.s * k / 255); acc[j * 3 + q] = 1 - (1 - acc[j * 3 + q]) * (1 - v); } }
    if (!any) return null;
    const c = mk(W, H), cg = c.getContext('2d'), id = cg.createImageData(W, H), d = id.data;
    for (let j = 0; j < W * H; j++) { if (src[j] || !img[j * 4 + 3]) continue; const v0 = acc[j * 3], v1 = acc[j * 3 + 1], v2 = acc[j * 3 + 2]; if (!(v0 || v1 || v2)) continue;
      d[j * 4] = v0 * 255; d[j * 4 + 1] = v1 * 255; d[j * 4 + 2] = v2 * 255; d[j * 4 + 3] = 255; }
    cg.putImageData(id, 0, 0); return c;
  }
  // ---------- Lampen, die sich bewegen oder hinter einem vorderen Gebäude stehen (v155) ----------
  // Sie werden in jedem Bild weich auf die Lichtkarte gelegt (Maximum wie in pxl), damit das Licht flüssig mitwandert;
  // Lampen hinter einem Gebäude beleuchten dessen Vorderseite nicht (Gebäude werden aus ihrem Licht ausgestanzt).
  function lampeMalen(g, x, y, o) { const p = o.power, R = p * o.r; if (!(R > .5) || !isFinite(x + y + R)) return; const c = rgbOf(o.color), gr = g.createRadialGradient(x + .5, y + .5, 0, x + .5, y + .5, R);
    for (let k = 0; k <= 8; k++) { const f = p * (1 - k / 8), v = k === 8 ? 0 : f >= 1 ? f : 1 - (1 - f) * (1 - f); gr.addColorStop(k / 8, `rgb(${Math.min(255, v * c[0] * 127.5) | 0},${Math.min(255, v * c[1] * 127.5) | 0},${Math.min(255, v * c[2] * 127.5) | 0})`); }
    g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2 + 1, R * 2 + 1); }
  function extraLampen(L, za, zb, f) { const lam = za.lampen + (zb.lampen - za.lampen) * f, keg = za.kegel + (zb.kegel - za.kegel) * f, W8 = '#ffd890', out = { v: [], h: [], lam };
    if (!(lam > .01)) return out;
    for (const l of L) { if (!l.move && !l.hinten) continue; const arr = l.hinten ? out.h : out.v, c = { lamp: (x, y, o) => arr.push([x, y, o]) }, cx = Math.round(l.x + l.w / 2), cy = Math.round(l.y + l.h / 2);
      if (l.laterne) c.lamp(cx, cy, { r: 18, color: W8, power: Math.min(1, .75 * lam) });   /* Handlaterne (Nachtwächter, Ruderboot): kleiner runder Schein, kein Kegel */
      else if (l.pool) { c.lamp(cx, cy, { r: 14, color: W8, power: .9 * lam }); KEGEL(c, cx, cy + 1, 18, { kegel: keg * .7 }, W8, { breite: 4, wachsen: .6 }); }
      else if (l.fire) c.lamp(cx, cy, { r: 16, color: l.c || W8, power: .9 * lam });
      (out.g || (out.g = [])).push(l); }
    return out; }
  const aus = () => window.LICHT_AUS === true;   /* zum Vergleichen: window.LICHT_AUS = true schaltet das neue Licht ab */
  return { apply: (...a) => { if (!aus()) apply(...a); }, an: () => !aus(), zeitGewicht, HOF, RAEUME };
})();
