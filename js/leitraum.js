// Leitstand-Kontrollraum: Pixel-Hintergrund hinter den Tafeln
// - hohe Bogenfenster links und rechts mit dem Himmel zur aktuellen Tageszeit (Wolken, Sonne, Mond, Sterne)
// - Förderband unter der Tafel: zeigt den Takt bis zum nächsten Tafelwechsel (ein Werkstück fällt dann in die Kiste)
// - ab und zu läuft jemand vorbei (Arbeiterinnen, Arbeiter, Katzenroboter)
'use strict';
const LEITRAUM = (() => {
  let cv, g, P = 3, W = 0, H = 0, root, takt, wand = null, wandKey = '', lay = null, last = 0, zeit = 0;
  const STARS = [], CLOUDS = [], DROPS = [], LEUTE = [];
  let off = 0, ziel = 1, seit = -1, kisteHuepf = 0, naechste = 8;
  const D_ABST = 34;   // Abstand der Werkstücke auf dem Band (Bildpunkte)
  const TEILE = ['blech', 'fraes', 'dreh', 'gewinde', 'baugruppe', 'gears'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mix = (a, b, q) => { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = h(a), B = h(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * q)).join(',') + ')'; };
  // Himmel über den Tag: [Tageszeit 0..1, oben, unten, Sterne]
  const HIMMEL = [[0, '#070b22', '#18204a', 1], [.21, '#0b1030', '#26305e', 1], [.27, '#3a3f7a', '#f0a07a', .3], [.33, '#5e9ad8', '#cfe2ee', 0], [.7, '#5e9ad8', '#d6e8f2', 0], [.78, '#4a3a7a', '#f08a5a', .2], [.85, '#151a42', '#3a2e5e', .9], [1, '#070b22', '#18204a', 1]];
  function tag() { if (window.FORCE_T !== undefined) return window.FORCE_T; const d = new Date(); return (d.getHours() + d.getMinutes() / 60) / 24; }
  function himmel(t) { let i = 0; while (i < HIMMEL.length - 2 && t > HIMMEL[i + 1][0]) i++; const a = HIMMEL[i], b = HIMMEL[i + 1], q = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return { o: mix(a[1], b[1], q), u: mix(a[2], b[2], q), st: a[3] + (b[3] - a[3]) * q }; }

  function start(r, getTakt) {
    root = r; takt = getTakt;
    cv = document.createElement('canvas'); cv.className = 'lraum'; cv.setAttribute('aria-hidden', 'true');
    root.insertBefore(cv, root.firstChild); g = cv.getContext('2d');
    groesse(); addEventListener('resize', groesse);
    if (window.ResizeObserver) new ResizeObserver(() => { lay = null; }).observe(root);
    requestAnimationFrame(frame);
  }
  function groesse() {
    const w = innerWidth, h = innerHeight;
    P = Math.max(2, Math.min(5, Math.round(Math.min(w / 480, h / 270))));
    root.style.setProperty('--lp', P + 'px');
    W = Math.ceil(w / P); H = Math.ceil(h / P); cv.width = W; cv.height = H;
    STARS.length = 0; for (let i = 0; i < W * H / 260; i++) STARS.push({ x: Math.random() * W, y: Math.random() * H * .8, p: Math.random() * 6.3, b: Math.random() < .15 });
    CLOUDS.length = 0; for (let i = 0; i < 7; i++) CLOUDS.push({ x: Math.random() * W, y: rnd(.05, .5) * H, w: rnd(14, 34), v: rnd(.6, 1.6) });
    lay = null;
  }
  // Lage der Tafel, des Bandes und der Fenster in Bildpunkten
  function layout() {
    const rr = root.getBoundingClientRect(), q = el => { const b = el.getBoundingClientRect(); return { x: (b.left - rr.left) / P, y: (b.top - rr.top) / P, w: b.width / P, h: b.height / P }; };
    const tafel = q(root.querySelector('.lrahmen')), band = q(root.querySelector('.lband')), kopf = q(root.querySelector('.lhead'));
    const fenster = [];
    const links = tafel.x - 4, rechts = W - (tafel.x + tafel.w) - 4;
    const top = kopf.y + kopf.h + 2, unten = band.y - 3;
    if (links >= 14 && unten - top > 40) { const fw = Math.min(46, Math.floor(links - 6)); fenster.push({ x: Math.round((links - fw) / 2) + 2, y: Math.round(top), w: fw, h: Math.round(unten - top) }); }
    if (rechts >= 14 && unten - top > 40) { const fw = Math.min(46, Math.floor(rechts - 6)); fenster.push({ x: Math.round(tafel.x + tafel.w + 4 + (rechts - fw) / 2), y: Math.round(top), w: fw, h: Math.round(unten - top) }); }
    // Oberlichter über der ganzen Breite hinter dem Kopf
    const ol = [];   /* keine Oberlichter: hinter der Überschrift wäre es zu unruhig */
    return { tafel, band, kopf, fenster, ol };
  }
  // Wand mit ausgesparten Fenstern (wird nur bei neuer Größe gezeichnet)
  function wandMalen(L) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const w = c.getContext('2d');
    w.fillStyle = '#211a26'; w.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 5) for (let x = -((y / 5) % 2) * 6; x < W; x += 12) { const k = ((x * 7 + y * 13) % 5); w.fillStyle = ['#2a2030', '#2c2232', '#271e2d', '#2e2434', '#291f2f'][k]; w.fillRect(x + 1, y + 1, 10, 3); }   // gedämpfte Ziegel
    w.fillStyle = '#17121c'; w.fillRect(0, L.kopf.y + L.kopf.h - 1, W, 2);
    const loch = (f, bogen) => {   // Fenster: Rahmen, Sprossen, Bogen; Glas bleibt durchsichtig
      w.fillStyle = '#4a3a2a'; w.fillRect(f.x - 2, f.y + (bogen ? f.w / 2 : 0) - 2, f.w + 4, f.h - (bogen ? f.w / 2 : 0) + 4);
      if (bogen) { w.beginPath(); w.arc(f.x + f.w / 2, f.y + f.w / 2, f.w / 2 + 2, Math.PI, 0); w.fill(); }
      w.save(); w.globalCompositeOperation = 'destination-out'; w.beginPath();
      if (bogen) { w.arc(f.x + f.w / 2, f.y + f.w / 2, f.w / 2, Math.PI, 0); w.rect(f.x, f.y + f.w / 2, f.w, f.h - f.w / 2); } else w.rect(f.x, f.y, f.w, f.h);
      w.fill(); w.restore();
      w.fillStyle = '#3a2e22'; const sx = f.w > 30 ? 4 : 3;
      for (let i = 1; i < sx; i++) w.fillRect(Math.round(f.x + i * f.w / sx), f.y + (bogen ? 2 : 0), 1, f.h - (bogen ? 2 : 0));
      for (let y = f.y + (bogen ? f.w / 2 : 6); y < f.y + f.h - 2; y += 9) w.fillRect(f.x, Math.round(y), f.w, 1);
      w.fillStyle = '#6a5440'; w.fillRect(f.x - 3, f.y + f.h + 2, f.w + 6, 2);   // Fensterbank
    };
    L.ol.forEach(f => loch(f, false)); L.fenster.forEach(f => loch(f, true));
    // Boden unter dem Band
    const b = L.band; w.fillStyle = '#3a3440'; w.fillRect(0, b.y + b.h - 6, W, H); w.fillStyle = '#4a4452'; w.fillRect(0, b.y + b.h - 6, W, 1);
    for (let x = 0; x < W; x += 10) { w.fillStyle = '#c99a2e'; w.fillRect(x, b.y + b.h - 2, 5, 1); }   // gelbe Laufweg-Markierung
    return c;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!root || root.hidden || document.hidden) { last = now; return; }
    const dt = Math.min(.1, last ? (now - last) / 1000 : 0); last = now; zeit += dt;
    if (!lay) { lay = layout(); wand = null; }
    const key = W + 'x' + H; if (!wand || wandKey !== key) { wand = wandMalen(lay); wandKey = key; }
    const t = tag(), s = himmel(t);
    // Himmel
    const gr = g.createLinearGradient(0, 0, 0, H * .9); gr.addColorStop(0, s.o); gr.addColorStop(1, s.u); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (s.st > .05) STARS.forEach(st => { const a = s.st * (.45 + .55 * Math.abs(Math.sin(zeit * (st.b ? 2.2 : .7) + st.p))); g.fillStyle = `rgba(255,248,220,${a.toFixed(2)})`; g.fillRect(Math.round(st.x), Math.round(st.y), 1, 1); });
    const tagq = Math.max(0, Math.min(1, (t - .25) / .5));   // Sonne wandert von links nach rechts
    if (t > .25 && t < .8) { const x = W * (.05 + .9 * tagq), y = H * (.45 - .35 * Math.sin(tagq * Math.PI)); g.fillStyle = '#fff2b0'; g.beginPath(); g.arc(Math.round(x), Math.round(y), 5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,240,170,.25)'; g.beginPath(); g.arc(Math.round(x), Math.round(y), 9, 0, 7); g.fill(); }
    else { const q = ((t + .25) % 1) / .5, x = W * (.1 + .8 * Math.min(1, q)), y = H * .2; g.fillStyle = '#f4ecd0'; g.beginPath(); g.arc(Math.round(x), Math.round(y), 4, 0, 7); g.fill(); g.fillStyle = s.o; g.beginPath(); g.arc(Math.round(x) + 2, Math.round(y) - 1, 4, 0, 7); g.fill(); }
    const wolke = 1 - s.st; if (wolke > .1) CLOUDS.forEach(c => { c.x += c.v * dt; if (c.x > W + c.w) c.x = -c.w; g.fillStyle = `rgba(255,255,255,${(.75 * wolke).toFixed(2)})`; const x = Math.round(c.x), y = Math.round(c.y); g.fillRect(x, y, c.w, 3); g.fillRect(x + 3, y - 2, c.w * .5, 2); g.fillRect(x + c.w * .45, y - 3, c.w * .35, 3); g.fillStyle = `rgba(200,210,230,${(.6 * wolke).toFixed(2)})`; g.fillRect(x + 1, y + 3, c.w - 2, 1); });
    g.drawImage(wand, 0, 0);
    // Lichtschein der Fenster am Tag
    band(dt);
    leute(dt);
  }
  // ---------- Förderband ----------
  function band(dt) {
    const b = lay.band, y = Math.round(b.y + 10), x0 = 18, n = Math.max(2, Math.floor((W - 46 - x0) / D_ABST)), x1 = x0 + n * D_ABST, k = takt();
    // Geschwindigkeit so, dass das vorderste Teil genau beim Tafelwechsel in die Kiste fällt
    if (k.seit !== seit) { seit = k.seit; ziel = Math.floor(off / D_ABST + 1e-6) * D_ABST + D_ABST; }
    if (!k.pausiert) { const rest = Math.max(.05, (k.t0 + k.dauer - performance.now()) / 1000); off = Math.min(ziel, off + (ziel - off) / rest * dt); }
    const vor = Math.floor(off / D_ABST + 1e-6);
    if (vor > band.vor) { DROPS.push({ id: band.vor - n + 1, t: 0 }); }
    band.vor = vor;
    // Gestell, Rollen, Gurt
    g.fillStyle = '#2a2a34'; for (let x = x0; x <= x1; x += 24) g.fillRect(x, y + 5, 2, b.h - 9);
    g.fillStyle = '#4a4a58'; g.fillRect(x0 - 4, y + 1, x1 - x0 + 8, 5);
    g.fillStyle = '#2b2b33'; g.fillRect(x0 - 4, y, x1 - x0 + 8, 1);
    const ph = (off * 1) % 6; g.fillStyle = '#36363f'; for (let x = x0 - 4 + (6 - ph); x < x1 + 4; x += 6) g.fillRect(Math.round(x), y, 2, 1);   // Gurt bewegt sich
    g.fillStyle = '#7a7a88'; for (let x = x0 - 2; x < x1 + 4; x += 8) g.fillRect(x, y + 3, 2, 2);
    // Trichter links
    g.fillStyle = '#5a4a3a'; g.fillRect(x0 - 14, y - 6, 10, 12); g.fillStyle = '#3a2e24'; g.fillRect(x0 - 12, y - 4, 6, 6); g.fillStyle = '#c99a2e'; g.fillRect(x0 - 14, y - 7, 10, 1);   /* Ausgabe, aus der die Werkstücke kommen */
    // Werkstücke
    const frac = off - vor * D_ABST, ic = typeof ICONS !== 'undefined' && ICONS.canvas;
    for (let i = 0; i < n; i++) { const id = vor - i, x = x0 + frac + i * D_ABST; if (x > x1) continue; const c = ic && ic[TEILE[((id % 6) + 6) % 6]]; if (c) g.drawImage(c, Math.round(x - 7), y - 13); }
    // Kiste rechts
    const kx = x1 + 6, hp = kisteHuepf > 0 ? 1 : 0; kisteHuepf = Math.max(0, kisteHuepf - dt);
    g.fillStyle = '#6a4a2a'; g.fillRect(kx, y - 3 - hp, 22, 13); g.fillStyle = '#8a6438'; g.fillRect(kx + 1, y - 2 - hp, 20, 2); g.fillRect(kx + 1, y + 4 - hp, 20, 1); g.fillStyle = '#4a321c'; g.fillRect(kx, y - 3 - hp, 1, 13); g.fillRect(kx + 21, y - 3 - hp, 1, 13);
    for (let i = DROPS.length - 1; i >= 0; i--) { const d = DROPS[i]; d.t += dt; const q = Math.min(1, d.t / .45), x = x1 + 4 + q * 14, yy = y - 13 + q * q * 14; const c = ic && ic[TEILE[((d.id % 6) + 6) % 6]];
      if (c && q < 1) { g.save(); g.beginPath(); g.rect(0, 0, W, y - 2); g.clip(); g.drawImage(c, Math.round(x - 7), Math.round(yy)); g.restore(); } if (q >= 1) { DROPS.splice(i, 1); kisteHuepf = .15; } }
  }
  band.vor = 0;
  // ---------- Leute, die ab und zu vorbeikommen ----------
  function leute(dt) {
    naechste -= dt;
    if (naechste <= 0 && LEUTE.length < 2) {
      naechste = rnd(20, 55); const dir = Math.random() < .5 ? 1 : -1, kat = Math.random() < .25;
      LEUTE.push(kat ? { kat: true, c: { x: dir > 0 ? -12 : W + 12, tx: dir > 0 ? W + 30 : -30, mode: 'walk', t: 0, dir, dist: 0 } }
        : { vi: Math.floor(Math.random() * 5), x: dir > 0 ? -10 : W + 10, dir, dist: 0, v: rnd(11, 15), carry: Math.random() < .4 });
    }
    const fuss = Math.round(lay.band.y + lay.band.h - 3);
    for (let i = LEUTE.length - 1; i >= 0; i--) {
      const p = LEUTE[i];
      if (p.kat) { const r = ART.catStep(p.c, dt, zeit, 0, W, 16, 1); ART.blit(g, r.fr, r.x, fuss + 1, null, r.flip); if (p.c.x > W + 20 || p.c.x < -20) LEUTE.splice(i, 1); continue; }
      p.x += p.dir * p.v * dt; p.dist += p.v * dt;
      const S = WORKERS.set('small', p.vi), fr = (p.carry && S.carry ? S.carry : S.walk)[Math.floor(p.dist / 2) % 8];
      WORKERS.put(g, fr, Math.round(p.x), fuss, p.dir < 0);
      if (p.x > W + 14 || p.x < -14) LEUTE.splice(i, 1);
    }
  }
  return { start, layoutNeu: () => { lay = null; } };
})();
