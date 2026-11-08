// Leitstand-Kontrollraum: Pixel-Hintergrund hinter den Tafeln
// - hohe Bogenfenster links und rechts mit dem Himmel zur aktuellen Tageszeit
//   (Wolken, Sonne, Mond, Sterne; nachts ab und zu Sternschnuppen, tagsüber Flugzeuge und ein Heißluftballon)
// - Förderband unter der Tafel: EIN Werkstück läuft von links nach rechts; kommt es in der Kiste an, wechselt die Tafel
// - ab und zu kommt jemand vorbei: Arbeiterinnen und Arbeiter, der Katzenroboter oder der Mecha
'use strict';
const LEITRAUM = (() => {
  let cv, g, cv2, g2, P = 3, W = 0, H = 0, root, takt, wand = null, lay = null, last = 0, zeit = 0;
  const STARS = [], CLOUDS = [], DROPS = [], LEUTE = [], FLUG = [];
  let seit = -1, teil = null, kisteHuepf = 0, inKiste = 0, naechste = 6, naechsterFlug = 6, naechsteSchnuppe = 5;
  const TEILE = ['blech', 'fraes', 'dreh', 'gewinde', 'baugruppe', 'gears'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const mix = (a, b, q) => { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = h(a), B = h(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * q)).join(',') + ')'; };
  // Himmel über den Tag: [Tageszeit 0..1, oben, unten, Sterne]
  const HIMMEL = [[0, '#070b22', '#18204a', 1], [.21, '#0b1030', '#26305e', 1], [.27, '#3a3f7a', '#f0a07a', .3], [.33, '#5e9ad8', '#cfe2ee', 0], [.7, '#5e9ad8', '#d6e8f2', 0], [.78, '#4a3a7a', '#f08a5a', .2], [.85, '#151a42', '#3a2e5e', .9], [1, '#070b22', '#18204a', 1]];
  function tag() { if (window.FORCE_T !== undefined) return window.FORCE_T; const d = new Date(); return (d.getHours() + d.getMinutes() / 60) / 24; }
  function himmel(t) { let i = 0; while (i < HIMMEL.length - 2 && t > HIMMEL[i + 1][0]) i++; const a = HIMMEL[i], b = HIMMEL[i + 1], q = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return { o: mix(a[1], b[1], q), u: mix(a[2], b[2], q), st: a[3] + (b[3] - a[3]) * q }; }
  const ic = k => typeof ICONS !== 'undefined' && ICONS.canvas ? ICONS.canvas[k] : null;

  function start(r, getTakt) {
    root = r; takt = getTakt;
    cv = document.createElement('canvas'); cv.className = 'lraum'; cv.setAttribute('aria-hidden', 'true');
    root.insertBefore(cv, root.firstChild); g = cv.getContext('2d');
    cv2 = document.createElement('canvas'); cv2.className = 'lraum vorn'; cv2.setAttribute('aria-hidden', 'true'); root.appendChild(cv2); g2 = cv2.getContext('2d');   /* Figuren laufen vor der Tafel (der Mecha ist größer als das Band) */
    groesse(); addEventListener('resize', groesse);
    if (window.ResizeObserver) new ResizeObserver(() => { lay = null; }).observe(root);
    requestAnimationFrame(frame);
  }
  function groesse() {
    const w = innerWidth, h = innerHeight;
    P = Math.max(2, Math.min(5, Math.round(Math.min(w / 480, h / 270))));
    root.style.setProperty('--lp', P + 'px');
    W = Math.ceil(w / P); H = Math.ceil(h / P); cv.width = W; cv.height = H; cv2.width = W; cv2.height = H;
    STARS.length = 0; for (let i = 0; i < W * H / 260; i++) STARS.push({ x: Math.random() * W, y: Math.random() * H * .8, p: Math.random() * 6.3, b: Math.random() < .15 });
    CLOUDS.length = 0; for (let i = 0; i < 9; i++) CLOUDS.push({ x: Math.random() * W, y: rnd(.12, .6) * H, w: rnd(12, 30), v: rnd(.6, 1.6) });
    lay = null;
  }
  // Lage der Tafel, des Bandes und der Fenster in Bildpunkten
  function layout() {
    const rr = root.getBoundingClientRect(), q = el => { const b = el.getBoundingClientRect(); return { x: (b.left - rr.left) / P, y: (b.top - rr.top) / P, w: b.width / P, h: b.height / P }; };
    const tafel = q(root.querySelector('.lrahmen')), band = q(root.querySelector('.lband'));
    const fenster = [], links = tafel.x - 4, rechts = W - (tafel.x + tafel.w) - 4;
    const top = tafel.y + 10, unten = tafel.y + tafel.h - 8;   /* Fenster innerhalb der Höhe der Tafel, mit Abstand zum Kopf */
    if (unten - top > 40) {
      if (links >= 14) { const fw = Math.min(44, Math.floor(links - 8)); fenster.push({ x: Math.round((links - fw) / 2) + 2, y: Math.round(top), w: fw, h: Math.round(unten - top) }); }
      if (rechts >= 14) { const fw = Math.min(44, Math.floor(rechts - 8)); fenster.push({ x: Math.round(tafel.x + tafel.w + 4 + (rechts - fw) / 2), y: Math.round(top), w: fw, h: Math.round(unten - top) }); }
    }
    const by = Math.round(band.y), bh = Math.round(band.h);
    return { tafel, fenster, band: { y: by, h: bh, gurt: by + 9, boden: by + bh - 4 } };
  }
  // Wand mit ausgesparten Fenstern und der Boden (nur bei neuer Größe gezeichnet)
  function wandMalen(L) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const w = c.getContext('2d'), F = (x, y, ww, hh, col) => { w.fillStyle = col; w.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
    F(0, 0, W, H, '#211a26');
    for (let y = 0; y < H; y += 5) for (let x = -((y / 5) % 2) * 6; x < W; x += 12) F(x + 1, y + 1, 10, 3, ['#2a2030', '#2c2232', '#271e2d', '#2e2434', '#291f2f'][((x * 7 + y * 13) % 5 + 5) % 5]);   // gedämpfte Ziegel
    L.fenster.forEach(f => {   // Bogenfenster: Rahmen, Sprossen; Glas bleibt durchsichtig
      w.fillStyle = '#4a3a2a'; w.fillRect(f.x - 2, f.y + f.w / 2 - 2, f.w + 4, f.h - f.w / 2 + 4); w.beginPath(); w.arc(f.x + f.w / 2, f.y + f.w / 2, f.w / 2 + 2, Math.PI, 0); w.fill();
      w.save(); w.globalCompositeOperation = 'destination-out'; w.beginPath(); w.arc(f.x + f.w / 2, f.y + f.w / 2, f.w / 2, Math.PI, 0); w.rect(f.x, f.y + f.w / 2, f.w, f.h - f.w / 2); w.fill(); w.restore();
      const sx = f.w > 30 ? 4 : 3; for (let i = 1; i < sx; i++) F(f.x + i * f.w / sx, f.y + 2, 1, f.h - 2, '#3a2e22');
      for (let y = f.y + f.w / 2; y < f.y + f.h - 2; y += 9) F(f.x, y, f.w, 1, '#3a2e22');
      F(f.x - 3, f.y + f.h + 2, f.w + 6, 2, '#6a5440'); F(f.x - 3, f.y + f.h + 4, f.w + 6, 1, '#2a1e16');   // Fensterbank
    });
    // Boden: Betonplatten, Warnkante am Band, gelbe Laufwegmarkierung
    const b = L.band, fy = b.gurt + 7;
    F(0, fy, W, H - fy, '#3b3642'); F(0, fy, W, 1, '#55505e');
    for (let x = 0; x < W; x += 32) F(x, fy + 1, 1, H - fy, '#332e3a');
    for (let x = 0; x < W; x += 6) F(x, fy + 1, 3, 2, (x / 6) % 2 ? '#1c1a20' : '#d8a933');   // schwarz-gelbe Kante
    for (let x = 4; x < W; x += 14) F(x, b.boden + 2, 7, 1, '#c99a2e');
    return c;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!root || root.hidden || document.hidden) { last = now; return; }
    const dt = Math.min(.1, last ? (now - last) / 1000 : 0); last = now; zeit += dt;
    if (!lay) { lay = layout(); wand = wandMalen(lay); }
    const t = tag(), s = himmel(t);
    himmelMalen(t, s, dt);
    g.drawImage(wand, 0, 0);
    band(dt);
    leute(dt);
  }
  // ---------- Himmel ----------
  function himmelMalen(t, s, dt) {
    const gr = g.createLinearGradient(0, 0, 0, H * .9); gr.addColorStop(0, s.o); gr.addColorStop(1, s.u); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (s.st > .05) STARS.forEach(st => { const a = s.st * (.45 + .55 * Math.abs(Math.sin(zeit * (st.b ? 2.2 : .7) + st.p))); g.fillStyle = `rgba(255,248,220,${a.toFixed(2)})`; g.fillRect(Math.round(st.x), Math.round(st.y), 1, 1); });
    const tagq = Math.max(0, Math.min(1, (t - .25) / .5));
    if (t > .25 && t < .8) { const x = W * (.05 + .9 * tagq), y = H * (.45 - .35 * Math.sin(tagq * Math.PI)); g.fillStyle = 'rgba(255,240,170,.25)'; g.beginPath(); g.arc(Math.round(x), Math.round(y), 9, 0, 7); g.fill(); g.fillStyle = '#fff2b0'; g.beginPath(); g.arc(Math.round(x), Math.round(y), 5, 0, 7); g.fill(); }
    else { const q = ((t + .25) % 1) / .5, x = W * (.1 + .8 * Math.min(1, q)), y = H * .25; g.fillStyle = '#f4ecd0'; g.beginPath(); g.arc(Math.round(x), Math.round(y), 4, 0, 7); g.fill(); g.fillStyle = s.o; g.beginPath(); g.arc(Math.round(x) + 2, Math.round(y) - 1, 4, 0, 7); g.fill(); }
    const wolke = 1 - s.st;
    if (wolke > .1) CLOUDS.forEach(c => { c.x += c.v * dt; if (c.x > W + c.w) c.x = -c.w; const x = Math.round(c.x), y = Math.round(c.y); g.fillStyle = `rgba(255,255,255,${(.75 * wolke).toFixed(2)})`; g.fillRect(x, y, c.w, 3); g.fillRect(x + 3, y - 2, c.w * .5, 2); g.fillRect(x + c.w * .45, y - 3, c.w * .35, 3); g.fillStyle = `rgba(200,210,230,${(.6 * wolke).toFixed(2)})`; g.fillRect(x + 1, y + 3, c.w - 2, 1); });
    // Was am Himmel vorbeikommt: nur in den Fenstern zu sehen, deshalb dort starten
    const fe = lay.fenster; if (!fe.length) return;
    const nacht = s.st > .6, tagHell = s.st < .3;
    naechsteSchnuppe -= dt; naechsterFlug -= dt;
    if (nacht && naechsteSchnuppe <= 0) { naechsteSchnuppe = rnd(6, 16); const f = fe[Math.floor(Math.random() * fe.length)]; FLUG.push({ k: 'schnuppe', x: f.x + rnd(0, f.w * .6), y: f.y + rnd(5, f.h * .4), vx: rnd(40, 60) * (Math.random() < .5 ? 1 : -1), vy: rnd(18, 28), t: 0, d: rnd(.6, 1) }); }
    if (tagHell && naechsterFlug <= 0) {
      naechsterFlug = rnd(14, 30); const f = fe[Math.floor(Math.random() * fe.length)], dir = Math.random() < .5 ? 1 : -1;
      if (Math.random() < .3 && !FLUG.some(o => o.k === 'ballon')) FLUG.push({ k: 'ballon', x: dir > 0 ? f.x - 14 : f.x + f.w + 14, y: f.y + rnd(f.h * .15, f.h * .5), vx: dir * rnd(1.6, 2.4), t: 0, ende: f.w + 30, farbe: ['#e0603a', '#3a8ad8', '#e0b23c'][Math.floor(Math.random() * 3)] });
      else FLUG.push({ k: 'flieger', x: dir > 0 ? -10 : W + 10, y: f.y + rnd(6, f.h * .35), vx: dir * rnd(26, 36), t: 0 });
    }
    for (let i = FLUG.length - 1; i >= 0; i--) {
      const o = FLUG[i]; o.t += dt; o.x += o.vx * dt; if (o.vy) o.y += o.vy * dt;
      const x = Math.round(o.x), y = Math.round(o.y), d = Math.sign(o.vx);
      if (o.k === 'schnuppe') { const a = Math.max(0, 1 - o.t / o.d); for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(255,250,220,${(a * (1 - k / 10)).toFixed(2)})`; g.fillRect(Math.round(o.x - d * k * 1.6), Math.round(o.y - k * .7), 1, 1); } if (o.t > o.d) FLUG.splice(i, 1); continue; }
      if (o.k === 'flieger') { for (let k = 3; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${(.5 * (1 - k / 40)).toFixed(2)})`; g.fillRect(x - d * k, y + 1, 1, 1); }   /* Kondensstreifen */
        R(x - 2, y, 5, 2, '#e8ecf2'); R(x + (d > 0 ? 3 : -3), y + 1, 1, 1, '#9aa4b4'); R(x - 1, y - 1, 2, 1, '#c8d0dc'); R(x - d * 2, y - 2, 1, 2, '#c8d0dc'); R(x, y + 2, 2, 1, '#9aa4b4');
        if (x < -50 || x > W + 50) FLUG.splice(i, 1); continue; }
      if (o.k === 'ballon') { const by = y + Math.round(Math.sin(o.t * .8) * 1.5);
        g.fillStyle = o.farbe; g.beginPath(); g.arc(x, by, 5, 0, 7); g.fill(); R(x - 4, by + 2, 8, 3, o.farbe); R(x - 2, by + 5, 4, 1, o.farbe); R(x - 1, by - 5, 2, 10, 'rgba(255,255,255,.35)'); R(x - 4, by - 1, 8, 1, 'rgba(0,0,0,.15)');
        R(x - 2, by + 6, 1, 3, '#5a4030'); R(x + 1, by + 6, 1, 3, '#5a4030'); R(x - 2, by + 9, 4, 3, '#8a6438');
        if (Math.abs(o.t * o.vx) > o.ende + 40) FLUG.splice(i, 1); }
    }
  }
  // ---------- Förderband: ein Werkstück pro Tafel ----------
  function band(dt) {
    const b = lay.band, y = b.gurt, x0 = 22, x1 = W - 40, k = takt();
    if (k.seit !== seit) {   // neue Tafel: am Ende angekommen -> kippt über die Rolle in die Kiste; von Hand umgeschaltet -> fällt vom Band auf den Boden und verschwindet
      if (teil && teil.x < x1 - 1) DROPS.push({ id: teil.id, x: teil.x, boden: true, t: 0 }); else if (teil) DROPS.push({ id: teil.id, x: x1, t: 0 });
      seit = k.seit; teil = { id: TEILE[Math.floor(Math.random() * TEILE.length)], x: x0 };
    }
    const q = k.pausiert ? (teil.q || 0) : Math.min(1, (performance.now() - k.t0) / k.dauer); teil.q = q; teil.x = x0 + (x1 - x0) * q;
    // Beine mit Streben
    for (let x = x0 + 4; x < x1; x += 30) { R(x, y + 5, 2, b.boden - y - 4, '#2c2c36'); R(x + 1, y + 5, 1, b.boden - y - 4, '#3e3e4a'); }
    for (let x = x0 + 4; x < x1 - 30; x += 30) for (let i = 0; i < 28; i += 2) R(x + 2 + i, y + 6 + Math.round(i * (b.boden - y - 8) / 28), 1, 1, '#2a2a33');
    // Gurt mit Stollen, die sich mit dem Teil bewegen
    R(x0 - 4, y, x1 - x0 + 8, 4, '#1c1c22'); R(x0 - 4, y, x1 - x0 + 8, 1, '#34343e');
    const ph = (teil.x * 1) % 5; for (let x = x0 - 2 + ph; x < x1 + 3; x += 5) R(x, y + 1, 1, 2, '#2a2a32');
    // Seitenwange mit Glanzkante und Schrauben
    R(x0 - 5, y + 3, x1 - x0 + 10, 4, '#5a5a6a'); R(x0 - 5, y + 3, x1 - x0 + 10, 1, '#8a8a9c'); R(x0 - 5, y + 6, x1 - x0 + 10, 1, '#3a3a46');
    for (let x = x0; x < x1; x += 12) R(x, y + 4, 1, 1, '#2a2a33');
    // Endrollen (drehen sich)
    for (const rx of [x0 - 4, x1 + 4]) { R(rx - 3, y - 1, 6, 6, '#2a2a33'); R(rx - 2, y, 4, 4, '#7a7a88'); const a = (teil.x / 3) % 4 | 0; R(rx - 1 + [0, 1, 1, 0][a], y + 1 + [0, 0, 1, 1][a], 1, 1, '#2a2a33'); }
    // Antrieb links mit blinkender Lampe
    R(x0 - 18, y - 6, 10, 13, '#3e5a52'); R(x0 - 18, y - 6, 10, 1, '#5e8a7c'); R(x0 - 16, y - 3, 6, 3, '#24332f'); R(x0 - 15, y + 2, 4, 1, '#24332f');
    R(x0 - 13, y - 9, 2, 3, '#1c1c22'); R(x0 - 13, y - 10, 2, 1, k.pausiert ? '#e0603a' : (zeit % 1.2 < .6 ? '#7ef08a' : '#2a6a34'));
    // Kiste unter dem Bandende: Rückwand, Teile darin, fallendes Teil, dann die Vorderwand davor
    const kx = x1 + 1, kw = 27, kt = y + 3 + (kisteHuepf > 0 ? 1 : 0), kh = b.boden - kt; kisteHuepf = Math.max(0, kisteHuepf - dt);
    R(kx + 1, kt - 2, kw - 2, 2, '#3a2614');   // Innenseite / Rückwand
    for (let i = 0; i < Math.min(3, inKiste); i++) { const c = ic(TEILE[(i * 2 + inKiste) % 6]); if (c) g.drawImage(c, kx + 1 + i * 6, kt - 5 + (i % 2)); }
    const c = ic(teil.id); if (c) g.drawImage(c, Math.round(teil.x - 7), y - 13);   // das Werkstück auf dem Band
    for (let i = DROPS.length - 1; i >= 0; i--) {
      const d = DROPS[i]; d.t += dt; const c2 = ic(d.id); if (!c2) { DROPS.splice(i, 1); continue; }
      if (d.boden) continue;   // fällt vor dem Band herunter (wird unten gezeichnet)
      const xx = x1 + 20 * d.t, yy = y - 13 + 80 * d.t * d.t;   // kippt über die Rolle und fällt in die Kiste
      g.save(); g.beginPath(); g.rect(0, 0, W, b.boden); g.clip(); g.drawImage(c2, Math.round(xx - 7), Math.round(yy)); g.restore();
      if (yy > kt + 1) { DROPS.splice(i, 1); kisteHuepf = .12; inKiste++; }
    }
    R(kx, kt, kw, kh, '#7a5430'); for (let yy = kt + 3; yy < b.boden - 1; yy += 3) R(kx + 1, yy, kw - 2, 1, '#5a3c20');
    R(kx, kt, kw, 1, '#a07040'); R(kx, kt, 1, kh, '#4a301a'); R(kx + kw - 1, kt, 1, kh, '#4a301a'); R(kx + 4, kt + 1, 1, kh - 1, '#5a3c20'); R(kx + kw - 5, kt + 1, 1, kh - 1, '#5a3c20');
    // von Hand umgeschaltet: das alte Teil fällt vom Band auf den Boden, bleibt kurz liegen und verblasst
    for (let i = DROPS.length - 1; i >= 0; i--) {
      const d = DROPS[i]; if (!d.boden) continue; const c2 = ic(d.id);
      const ziel = b.boden - 13, yy = Math.min(ziel, y - 13 + 90 * d.t * d.t), a = d.t < 1 ? 1 : Math.max(0, 1 - (d.t - 1) / .5);
      g.globalAlpha = a; g.drawImage(c2, Math.round(d.x - 7), Math.round(yy)); g.globalAlpha = 1;
      if (a <= 0) DROPS.splice(i, 1);
    }
  }
  // ---------- Wer ab und zu vorbeikommt ----------
  function leute(dt) {
    const g0 = g; g = g2; g.clearRect(0, 0, W, H);
    try { leute0(dt); } finally { g = g0; }
  }
  function leute0(dt) {
    naechste -= dt;
    if (naechste <= 0 && LEUTE.length < 2) {
      naechste = rnd(18, 50); const dir = Math.random() < .5 ? 1 : -1, z = Math.random();
      if (z < .15 && !LEUTE.some(p => p.mecha)) LEUTE.push({ mecha: true, x: dir > 0 ? -20 : W + 20, dir, dist: 0, v: 7 });
      else if (z < .37) LEUTE.push({ kat: true, c: { x: dir > 0 ? -10 : W + 10, tx: dir > 0 ? W + 30 : -30, mode: 'walk', t: 0, dir, dist: 0 } });
      else LEUTE.push({ vi: Math.floor(Math.random() * 5), x: dir > 0 ? -10 : W + 10, dir, dist: 0, v: rnd(11, 15), carry: Math.random() < .4 });
    }
    const fuss = lay.band.boden;
    for (let i = LEUTE.length - 1; i >= 0; i--) {
      const p = LEUTE[i];
      if (p.kat) { const r = ART.catStep(p.c, dt, zeit, 0, W, 9, .55); ART.blit(g, r.fr, r.x, fuss + 1, null, r.flip); if (p.c.x > W + 20 || p.c.x < -20) LEUTE.splice(i, 1); continue; }
      p.x += p.dir * p.v * dt; p.dist += p.v * dt;
      if (p.mecha) { const sp = ART.SPR.mechaSideFrame({ step: Math.floor(p.dist / 2) % 8 }, 'stahl'); ART.blit(g, sp, Math.round(p.x), fuss + 1, null, p.dir > 0); if (p.x > W + 30 || p.x < -30) LEUTE.splice(i, 1); continue; }
      const S = WORKERS.set('small', p.vi), fr = (p.carry && S.carry ? S.carry : S.walk)[Math.floor(p.dist / 2) % 8];
      WORKERS.put(g, fr, Math.round(p.x), fuss, p.dir < 0);
      if (p.x > W + 14 || p.x < -14) LEUTE.splice(i, 1);
    }
  }
  // für Tests: jemanden sofort vorbeischicken bzw. etwas an den Himmel setzen
  function test(k) { const f = lay && lay.fenster[0];
    if (k === 'kiste') DROPS.push({ id: 'gears', x: W - 40, t: 0 });
    if (k === 'mecha') LEUTE.push({ mecha: true, x: W * .3, dir: 1, dist: 0, v: 7 });
    if (k === 'kat') LEUTE.push({ kat: true, c: { x: W * .55, tx: W + 30, mode: 'walk', t: 0, dir: 1, dist: 0 } });
    if (k === 'leute') LEUTE.push({ vi: 1, x: W * .7, dir: -1, dist: 0, v: 13, carry: true });
    if (k === 'ballon' && f) FLUG.push({ k: 'ballon', x: f.x + f.w / 2, y: f.y + f.h * .3, vx: 2, t: 0, ende: 999, farbe: '#e0603a' });
    if (k === 'flieger' && f) FLUG.push({ k: 'flieger', x: f.x + f.w * .7, y: f.y + 30, vx: 30, t: 0 });
    if (k === 'schnuppe' && f) FLUG.push({ k: 'schnuppe', x: f.x + 10, y: f.y + 20, vx: 50, vy: 22, t: 0, d: 5 }); }
  return { start, test, layoutNeu: () => { lay = null; } };
})();
