// kleine Hinweise im Bild: Ausrufezeichen-Blase, Kiste, Schloss, Auswahlrahmen (wie im „Stilles Ufer“)
'use strict';
const OVER = (() => {
  const R = ART.R;
  const CR = ART.buildSprite(['cddddddc', 'dffffffd', 'deeeeeed', 'dEaEEaEd', 'dccccccd', 'deeeeeed', 'cddddddc']);
  const OVER = {
    bubble(g, cx, by, c, q) { R(g, cx - 3, by - 10, 7, 9, '#2a2236'); R(g, cx - 2, by - 9, 5, 7, '#fff6e0'); if (q) { R(g, cx - 1, by - 8, 3, 1, c); R(g, cx + 1, by - 7, 1, 1, c); R(g, cx, by - 6, 1, 1, c); R(g, cx, by - 4, 1, 1, c); } else { R(g, cx, by - 8, 1, 3, c || '#d0394f'); R(g, cx, by - 4, 1, 1, c || '#d0394f'); } R(g, cx, by - 1, 1, 1, '#2a2236'); },
    crate(g, cx, by) { g.globalAlpha = .3; R(g, cx - 4, by, 9, 1, '#1d1826'); g.globalAlpha = 1; g.drawImage(CR.c, cx - 5, by - 9); },   // Kiste ohne Hintergrundfläche, nur mit eigener Kontur
    lock(g, cx, by) { R(g, cx - 3, by - 8, 7, 6, '#2a2236'); R(g, cx - 2, by - 7, 5, 4, '#e8a83a'); R(g, cx - 2, by - 11, 1, 3, '#2a2236'); R(g, cx + 2, by - 11, 1, 3, '#2a2236'); R(g, cx - 1, by - 12, 3, 1, '#2a2236'); R(g, cx, by - 6, 1, 2, '#2a2236'); },
    // Aufstell-Markierung: leuchtende Bodenplatte, hüpfender Pfeil und Plus-Blase
    spot(g, cx, b, w, time, i) {
      cx = Math.round(cx); b = Math.round(b); const pl = (Math.sin(time * 4 + i * 1.3) + 1) / 2, x0 = cx - Math.floor(w / 2);
      g.globalAlpha = .45 + .35 * pl; R(g, x0 + 1, b - 3, w - 2, 1, '#ffe08a'); R(g, x0, b - 2, w, 3, '#ffe08a'); R(g, x0 + 1, b + 1, w - 2, 1, '#ffe08a'); g.globalAlpha = 1;
      for (let x = x0; x < x0 + w; x += 2) { R(g, x, b - 4, 1, 1, '#fff6e0'); R(g, x + 1, b + 2, 1, 1, '#fff6e0'); }
      R(g, x0 - 1, b - 3, 1, 4, '#fff6e0'); R(g, x0 + w, b - 3, 1, 4, '#fff6e0');
      for (let j = 4; j < 34; j++) { g.globalAlpha = (.1 + .14 * pl) * (1 - j / 34); R(g, x0 + 2, b - j, w - 4, 1, '#fff3c0'); } g.globalAlpha = 1;   // Lichtsäule
      OVER.plus(g, Math.max(8, Math.min(ART.W - 8, cx)), b - 12 - Math.round(Math.abs(Math.sin(time * 3 + i)) * 4));
    },
    frame(g, x, y, w, h, time, i) {
      const pl = (Math.sin(time * 4 + i * 1.3) + 1) / 2;
      g.globalAlpha = .22 + .25 * pl; R(g, x, y, w, h, '#ffe08a'); g.globalAlpha = 1;
      for (let d = 0; d < w; d += 3) { R(g, x + d, y, 2, 1, '#fff6e0'); R(g, x + d, y + h - 1, 2, 1, '#fff6e0'); }
      for (let d = 0; d < h; d += 3) { R(g, x, y + d, 1, 2, '#fff6e0'); R(g, x + w - 1, y + d, 1, 2, '#fff6e0'); }
      OVER.plus(g, x + w / 2, y + h / 2 + 5 - Math.round(Math.abs(Math.sin(time * 3 + i)) * 2));
    },
    plus(g, cx, by) { cx = Math.round(cx); by = Math.round(by); R(g, cx - 6, by - 13, 13, 13, '#2a2236'); R(g, cx - 5, by - 12, 11, 11, '#fff6e0'); R(g, cx - 5, by - 12, 11, 1, '#ffffff'); R(g, cx - 4, by - 7, 9, 2, '#2f8a7e'); R(g, cx - 1, by - 10, 2, 8, '#2f8a7e'); R(g, cx - 2, by, 5, 1, '#2a2236'); R(g, cx - 1, by + 1, 3, 1, '#2a2236'); R(g, cx, by + 2, 1, 1, '#2a2236'); },
    dim(g, w, h) { g.globalAlpha = .38; R(g, 0, 0, w, h, '#120c24'); g.globalAlpha = 1; },
    box(g, x0, y0, x1, y1, c) { const corner = (px, py, dx, dy) => { R(g, dx > 0 ? px : px - 3, py, 4, 1, c); R(g, px, dy > 0 ? py : py - 3, 1, 4, c); }; corner(x0, y0, 1, 1); corner(x1, y0, -1, 1); corner(x0, y1, 1, -1); corner(x1, y1, -1, -1); }
  };
  return OVER;
})();
