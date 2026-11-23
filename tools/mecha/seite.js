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
    /* v158: Arm schwingt um Schulter und Ellenbogen (gedrehte Glieder statt verschobener Kästen).
       Winkel gegen die Senkrechte, positiv = nach vorn (links). Der Unterarm schwingt etwas weiter und knickt leicht nach vorn. */
    const seg = (px, py, len, w, ang, ramp, o, endDark) => { const s = Math.sin(ang), c = Math.cos(ang), ux = -s, uy = c, hw = w / 2;   // Achse nach unten, um ang gedreht
      const x0 = Math.floor(px - len - w), x1 = Math.ceil(px + len + w), y0 = Math.floor(py - w), y1 = Math.ceil(py + len + w);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x + .5 - px, dy = y + .5 - py, u = dx * ux + dy * uy, v = dx * uy - dy * ux;
        if (u < 0 || u > len || Math.abs(v) > hw) continue; const nx = -v / hw; let l = -nx * .55 + Math.sqrt(Math.max(0, 1 - nx * nx)) * .5 - (o || 0);
        if (u < 1.2) l += .3; if (u > len - 1.2 && endDark) l -= .4; if (Math.abs(v) > hw - 1) l -= .2; g.set(x, y, pick(ramp, l, x, y)); } };
    const at = (px, py, len, ang) => [px - Math.sin(ang) * len, py + Math.cos(ang) * len];
    const arm = (sw, o) => { const ax = CX + 4, sy = 42 + B, a1 = -sw / 12 * .26 + .08, a2 = a1 * 1.2 + .12;   /* sw > 0 = Hand nach hinten; leicht nach vorn gedreht */
      const [ex, ey] = at(ax, sy, 12, a1), [wx, wy] = at(ex, ey, 12, a2);
      seg(ax, sy, 13, 11, a1, DK, o, 1); { const [kx, ky] = at(ax, sy, 4, a1); g.set(Math.round(kx), Math.round(ky), 'U'); }        // Oberarm mit Fuge
      { const [p1x, p1y] = at(ax + 6 * Math.cos(a1), sy + 6 * Math.sin(a1), 3, a1), [p2x, p2y] = at(ex + 6 * Math.cos(a1), ey + 6 * Math.sin(a1), -2, a1); g.rect(Math.round(p1x) - 1, Math.round(p1y) - 1, 2, 4, o ? 'T' : 'X'); ln(Math.round(p1x), Math.round(p1y) + 3, Math.round(p2x), Math.round(p2y), o ? 'D' : 'E'); }   // Kolben hinten
      seg(ex, ey + 1, 13, 14, a2, SH, o, 1); { const [r1x, r1y] = at(ex, ey + 1, 9, a2); for (let i = -6; i <= 6; i++) g.set(Math.round(r1x + i * Math.cos(a2)), Math.round(r1y + i * Math.sin(a2)), o ? 'g' : 'h'); }   // Unterarm mit Fuge
      ball(Math.round(ex), Math.round(ey), 6.5, 4.5, DK, o); g.set(Math.round(ex) - 1, Math.round(ey), o ? 'T' : 'D'); g.set(Math.round(ex), Math.round(ey), o ? 'U' : 'C');   // Ellenbogen
      { const a3 = a2 + .12, px = Math.round(wx), py = Math.round(wy) + 1, snap = g.a.map(r => r.slice()); hand(px, py, o);   /* v158: Hand knickt im Handgelenk mit (um das Gelenk gedreht) */
        const hp = []; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.a[y][x] !== snap[y][x]) { hp.push([x, y, g.a[y][x]]); g.a[y][x] = snap[y][x]; }
        const HM = {}; hp.forEach(([x, y, c]) => HM[x + ',' + y] = c); const ca = Math.cos(a3), sa = Math.sin(a3);
        for (let y = py - 4; y <= py + 30; y++) for (let x = px - 26; x <= px + 26; x++) { const X2 = x + .5 - (px + .5), Y2 = y + .5 - py, dx = X2 * ca + Y2 * sa, dy = -X2 * sa + Y2 * ca, c = HM[Math.floor(px + .5 + dx) + ',' + Math.floor(py + dy)]; if (c) g.set(x, y, c); } }
      if (!o) { const rim = [-2.2, -1.7, -1.2, -.7, -.25, .2].map(t => [Math.round(CX + 4 + Math.cos(t) * 14.5), Math.round(34 + B + Math.sin(t) * 13.5)]); cable([...rim, [Math.round(ex) + 8, Math.round(ey) - 2], [Math.round(wx) + 8, Math.round(wy) - 3]]); } };   /* Schlauch über den Rand des Schulterpanzers, dann hinten am Arm hinab */
    const armSw = q => Math.cos((f / 8 + q) * Math.PI * 2 - .9) * 10;   /* v158: Arme pendeln gegen die Beine, aber eine Spur nachlaufend und schwächer */
    leg(LB.x, LB.up, .55);                                                                                                  // hinteres Bein im Schatten
    arm(armSw(.5), .5);                                                                                                            // hinterer Arm
    ball(CX + 14, 33 + B, 11, 11, SH, .5);                                                                                  // hinterer Schulterpanzer
    /* v158: Rückentank von der Seite: stehende Kapsel mit Spannbändern, Ventil, Lüftungsschlitzen und Schubdüse unten, kurzer schräger Auspuff oben */
    ball(CX + 19, 37 + B, 6.5, 6, SH, .15); ball(CX + 19, 55 + B, 6.5, 5, SH, .3); box(CX + 13, 37 + B, CX + 25, 55 + B, SH, .15);
    for (const y of [41, 51]) { g.rect(CX + 13, y + B, 13, 2, 'X'); g.rect(CX + 13, y + B, 13, 1, 'Y'); g.set(CX + 24, y + B, 'T'); }
    for (let y = 44; y <= 48; y += 2) g.rect(CX + 17, y + B, 6, 1, 'T');
    g.rect(CX + 14, 33 + B, 3, 2, 'D'); g.set(CX + 15, 32 + B, 'E');
    box(CX + 16, 59 + B, CX + 22, 61 + B, DK); box(CX + 15, 62 + B, CX + 23, 64 + B, DK); g.rect(CX + 17, 64 + B, 5, 1, 'U');
    for (let i = 0; i < 9; i++) { const x = CX + 20 + Math.round(i * .45), y = 31 + B - i; g.rect(x, y, 3, 1, i === 8 ? 'Y' : 'X'); g.set(x + 2, y, 'T'); } g.rect(CX + 23, 22 + B, 4, 1, 'Z');
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
    /* v158: von der Seite eine nach hinten gezogene Sensorfinne (von vorn schmal): Vorderkante hell, Hinterkante dunkel, Signallampe vorn oben */
    /* v158: Spitze von der Seite: Sockel, schräger Sensormast mit roter Signalkugel, dünne Peitschenantenne dahinter */
    box(hx - 1, hy - 11, hx + 4, hy - 9, SH); g.rect(hx - 1, hy - 9, 6, 1, 'g');
    for (let j = 0; j < 6; j++) { const x = hx + 1 + Math.round(j * .35), y = hy - 12 - j; g.set(x, y, 'j'); g.set(x + 1, y, 'h'); }
    g.rect(hx + 2, hy - 20, 3, 3, awake ? 'u' : 'h'); g.set(hx + 2, hy - 20, awake ? 'v' : 'i'); g.set(hx + 4, hy - 18, awake ? 't' : 'g'); g.rect(hx + 3, hy - 21, 1, 1, awake ? 'u' : 'h');
    ln(hx + 5, hy - 10, hx + 9, hy - 17, 'h'); g.set(hx + 9, hy - 18, 'g');
    for (let y = hy - 1; y <= hy + 8; y++) { const w = y < hy + 5 ? 8 : 8 - (y - hy - 4); g.rect(hx - 10, y, w, 1, y === hy - 1 ? 'x' : 'U'); }   // Gesicht vorn
    g.set(hx - 9, hy + 2, awake ? 'W' : 'u'); g.set(hx - 8, hy + 2, awake ? 'W' : 'u'); g.set(hx - 7, hy + 2, awake ? 'V' : 'u');   // ein Auge
    arm(armSw(0), 0);                                                                                                            // vorderer Arm pendelt gegen das vordere Bein
    return g.rows();
  }
