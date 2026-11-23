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
    /* v158: Arm folgt einem Gelenk: Oberarm neigt sich mit, Ellenbogen, Unterarm schräg zur Hand; Kolben hinten am Oberarm, Versorgungsschlauch am Arm entlang */
    const shear = (x0, y0, x1, y1, ramp, o, dx) => { for (let y = y0; y <= y1; y++) { const off = Math.round(dx * (y - y0) / Math.max(1, y1 - y0)); for (let x = x0; x <= x1; x++) { const nx = ((x - x0) / Math.max(1, x1 - x0)) * 2 - 1; let l = -nx * .55 + Math.sqrt(Math.max(0, 1 - nx * nx)) * .5 - (o || 0); if (y === y0) l += .3; if (y === y1) l -= .4; if (x === x0 || x === x1) l -= .2; g.set(x + off, y, pick(ramp, l, x + off, y)); } } };
    const arm = (sw, o) => { const ax = CX + 4, ex = ax + Math.round(sw * .3), hx = ax + sw;
      shear(ax - 5, 42 + B, ax + 5, 53 + B, DK, o, ex - ax); g.rect(ax - 4 + Math.round((ex - ax) * .45), 47 + B, 9, 1, 'U');   // Oberarm
      g.rect(ax + 6, 43 + B, 2, 5, o ? 'T' : 'X'); ln(ax + 7, 48 + B, ex + 6, 53 + B, o ? 'D' : 'E');                                // Kolben
      ball(ex, 55 + B, 6.5, 4, DK, o); g.set(ex - 1, 55 + B, o ? 'T' : 'D'); g.set(ex, 55 + B, o ? 'U' : 'C');                        // Ellenbogen
      shear(ex - 7, 58 + B, ex + 7, 67 + B, SH, o, hx - ex); g.rect(ex - 6 + Math.round((hx - ex) * .5), 63 + B, 13, 2, o ? 'g' : 'h'); g.rect(ex - 6 + Math.round((hx - ex) * .1), 59 + B, 13, 1, o ? 'h' : 'j');   // Unterarm
      hand(hx, 68 + B, o);
      if (!o) cable([[CX + 17, 29 + B], [CX + 17, 38 + B], [ax + 9, 46 + B], [ex + 8, 54 + B], [hx + 8, 64 + B]]); };
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
