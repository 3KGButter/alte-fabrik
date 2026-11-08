// Pixel-Icons für Ressourcen (8x8, mit derselben Kontur)
'use strict';
const ICONS = (() => {
  const I = {
    gears: (() => { const R = [];   /* Zahnrad aus Messing: 8 Zähne, Nabe mit Loch, Licht von links oben */
      for (let y = 0; y < 12; y++) { let r = ''; for (let x = 0; x < 12; x++) { const dx = x - 5.5, dy = y - 5.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), tooth = Math.cos(a * 8) > .3, R0 = tooth ? 6 : 4.6;
        if (d > R0 || d < 1.4) { r += '.'; continue; } if (d < 2.4) { r += 'C'; continue; } const l = -(dx + dy) / 10 + (d > R0 - 1 ? -.25 : 0) + (d < 3.4 ? .2 : 0); r += l > .35 ? 'G' : l > .1 ? 'F' : l > -.2 ? 'E' : 'D'; } R.push(r); } return R; })(),
    plans: ['zzzzzz..', 'zBBBBzz.', 'zBzzBBz.', 'zBzBBzBz', 'zBzzzzBz', 'zBBBBBBz', 'zzzzzzzz', '........'],
    // Blechteil: gekanteter Winkel mit Bohrungen (hellblauer Stahl)
    blech: ['BAAAz.......', 'BAAAz.......', 'BAxAz.......', 'BAAAz.......', 'BAAAz.......', 'BAxAz.......', 'BAAAzBBBBBBB', 'BAAAAAAAAAAz', 'BAAxAAAxAAAz', 'zzzzzzzzzzzz'],
    // Frästeil: Stahlblock mit gefräster Stufe und Nut
    fraes: ['......lllll.', '.....ljjjjjh', '....ljjjjjhh', '.lllliiiiihh', 'ljjjjjhhhihh', 'iiiiiihhhih.', 'iigiiihhhh..', 'iigiiihhh...', 'iiiiiihh....', 'hhhhhhh.....'],
    // Drehteil: abgesetzte Welle mit Glanzlinie
    dreh: ['....hhhh....', '....llllhhh.', '.hhhjjjjlllh', 'hllljjjjjjjl', 'hiiijjjjjjji', '.gggjjjjiiig', '....iiiiggg.', '....gggg....'],
    // Gewindeteil: Schraube aus Messing mit Sechskantkopf und Gewindegängen
    gewinde: ['DEFFFED', 'DEFFFED', 'CDDDDDC', '..DFD..', '..CEF..', '..DFD..', '..CEF..', '..DFD..', '..CEF..', '..DFD..', '...D...'],
    // Baugruppe: Gehäuse mit Zahnrad und Schraube
    baugruppe: ['......l.l...', '.....llljl..', '....ljjhjjl.', '.....jh.hj..', 'PPPPljjhjjlP', 'PQQQQljjjlQO', 'PQEQQQlQlQQO', 'PQQQQQQQQQQO', 'PQQQQQQQQEQO', 'OOOOOOOOOOOO'],
    power: ['....F...', '...FE...', '..FE....', '.FEEEF..', '...EF...', '..EF....', '..F.....', '........'],
    book: ['.uuuuuu.', 'uvvvvvuJ', 'uvJJJvuJ', 'uvvvvvuJ', 'uvJJvvuJ', 'uvvvvvuJ', 'uuuuuuuJ', '.JJJJJJJ'],
    clip: ['..hhh...', 'dhjjjhd.', 'dJJJJJd.', 'dJaaaJd.', 'dJJJJJd.', 'dJaaJJd.', 'dJJJJJd.', 'ddddddd.'],
    cart: ['........', 'cddddddc', 'deeeeeed', 'deFFFFed', 'dccccccd', 'deeeeeed', 'cddddddc', '........'],
    rank: ['...E....', '..EFE...', '...F....', 'jj.FE...', 'ij.FE.DD', 'ij.FE.CD', 'ij.FE.CD', 'ijjFEECD'],   // Siegerpodest
    medal: ['.u...u..', '..u.u...', '...u....', '..EEE...', '.EFFFE..', '.EFEFE..', '.EFFFE..', '..EEE...'],
    menu: ['........', 'hhhhhhh.', '........', 'hhhhhhh.', '........', 'hhhhhhh.', '........', '........'],
    trash: ['..hhhh..', 'hjjjjjjh', 'gggggggg', '.jhjhjh.', '.jhjhjh.', '.jhjhjh.', '.jhjhjh.', '.hgggg..'],
    close: ['u......u', '.u....u.', '..u..u..', '...uu...', '...uu...', '..u..u..', '.u....u.', 'u......u'],
    store: ['........', 'cddddddc', 'deeeeeed', 'dccccccd', 'deeeeeed', 'dccccccd', 'cddddddc', '........']
  };
  const NAV = (() => { const G = (fn) => { const g = ART.Grid(19, 19); fn(g); return g.rows(); }, B = ART.sBox, Bl = ART.sBall;
    const disc = (g, cx, cy, r, fn) => { for (let y = 0; y < 19; y++) for (let x = 0; x < 19; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= r) g.set(x, y, fn(x - cx, y - cy, d)); } };
    return {
      book: G(g => { B(g, 3, 1, 15, 17, ['s', 't', 'u', 'v'], .45); for (let y = 2; y < 17; y++) g.set(4, y, 's'); for (let y = 2; y < 17; y++) { g.set(16, y, y % 2 ? 'J' : 'I'); g.set(17, y + 1 > 17 ? 17 : y + 1, 'I'); }   /* Questbuch: Ledereinband, Seitenschnitt */
        for (const [x, y] of [[5, 2], [14, 2], [5, 16], [14, 16]]) { g.set(x, y, 'F'); } B(g, 7, 5, 12, 9, ['C', 'D', 'E', 'F'], .5); g.rect(8, 7, 4, 1, 'C'); for (let y = 11; y < 19; y++) if (y < 18) g.set(11, y, 'u'); g.set(10, 18, 'u'); g.set(12, 18, 'u'); }),
      gears: G(g => { const gear = (cx, cy, R1, R2, n, pal) => disc(g, cx, cy, R1 + 1, (dx, dy, d) => { const a = Math.atan2(dy, dx), R0 = Math.cos(a * n) > .3 ? R1 + .9 : R2; if (d > R0) return '.'; if (d < 1.5) return '.'; if (d < 2.5) return pal[0]; const l = -(dx + dy) / (R1 * 2.4) + (d > R0 - 1 ? -.25 : 0); return pal[l > .3 ? 4 : l > .08 ? 3 : l > -.15 ? 2 : 1]; });   /* Fabrik: zwei Zahnräder greifen ineinander */
        gear(7, 7.5, 5.6, 4.3, 8, ['T', 'X', 'Y', 'Z', 'l']); gear(13.5, 13, 4, 2.9, 7, ['C', 'D', 'E', 'F', 'G']); }),
      clip: G(g => { B(g, 3, 2, 15, 18, ['b', 'c', 'd', 'e'], .4); g.rect(5, 4, 9, 13, 'J'); g.rect(13, 5, 1, 12, 'I'); B(g, 7, 1, 11, 4, ['g', 'h', 'i', 'j'], .6); g.rect(8, 2, 3, 1, 'a');   /* Aufträge: Klemmbrett mit Liste */
        for (const y of [7, 10, 13]) { g.set(6, y, 'q'); g.set(7, y + 1, 'q'); g.set(8, y, 'q'); g.rect(10, y, 3, 1, 'h'); } }),
      cart: G(g => { for (let x = 1; x < 4; x++) g.set(x, 3, 'g'); for (let i = 0; i < 4; i++) g.set(3 + i, 3 + i, 'g');   /* Katalog: Einkaufswagen mit Kisten */
        for (let y = 6; y < 13; y++) for (let x = 5 + (y - 6) / 3 | 0; x < 17; x++) g.set(x, y, (x + y) % 3 === 0 ? 'h' : y === 6 ? 'j' : 'i'); g.rect(6, 13, 11, 1, 'g'); B(g, 8, 3, 11, 7, ['b', 'c', 'd', 'e'], .5); B(g, 12, 4, 15, 7, ['s', 't', 'u', 'v'], .5);
        for (const x of [7, 15]) { g.rect(x - 1, 15, 3, 3, 'T'); g.set(x, 16, 'j'); } g.rect(6, 14, 11, 1, 'g'); }),
      medal: G(g => { for (let y = 0; y < 8; y++) { g.set(5 + (y >> 1), y, 'u'); g.set(6 + (y >> 1), y, 'v'); g.set(13 - (y >> 1), y, 'u'); g.set(12 - (y >> 1), y, 't'); }   /* Badges: Medaille am roten Band */
        disc(g, 9, 12, 5.5, (dx, dy, d) => d > 4.6 ? 'D' : d > 3.6 ? 'E' : (dx + dy < -2 ? 'G' : 'F')); g.rect(8, 10, 3, 1, 'D'); g.rect(9, 10, 1, 5, 'D'); g.rect(8, 14, 3, 1, 'D'); }),
      rank: G(g => { B(g, 6, 10, 12, 18, ['C', 'D', 'E', 'F'], .5); B(g, 0, 13, 6, 18, ['g', 'h', 'i', 'j'], .5); B(g, 12, 15, 18, 18, ['b', 'c', 'd', 'e'], .5);   /* Rangliste: Siegertreppchen mit Pokal */
        g.rect(9, 12, 1, 4, 'C'); g.set(8, 12, 'C'); g.rect(8, 15, 3, 1, 'C'); g.rect(2, 15, 3, 1, 'g'); g.set(4, 16, 'g'); g.rect(2, 17, 3, 1, 'g'); g.rect(14, 16, 3, 1, 'b'); g.rect(14, 17, 3, 1, 'b');
        B(g, 6, 1, 12, 6, ['C', 'D', 'E', 'F'], .6); g.set(5, 2, 'E'); g.set(13, 2, 'E'); g.set(5, 3, 'D'); g.set(13, 3, 'D'); g.rect(8, 7, 3, 1, 'D'); g.rect(7, 8, 5, 1, 'E'); g.set(8, 2, 'G'); }),
      menu: G(g => { for (const y of [4, 9, 14]) { B(g, 2, y, 16, y + 2, ['g', 'h', 'i', 'j'], .55); } })   /* Menü: drei Balken */
    }; })();
  const out = {}, cv = {};
  Object.keys(NAV).forEach(k => { const s = ART.buildSprite(NAV[k]), c = document.createElement('canvas'); c.width = 21; c.height = 21; const put = () => { const g = c.getContext('2d'); g.clearRect(0, 0, 21, 21); g.drawImage(s.c, Math.floor((21 - s.c.width) / 2), Math.floor((21 - s.c.height) / 2)); }; put(); out['nav_' + k] = c.toDataURL(); cv['nav_' + k] = c; ART.onRestore(put); });   /* Leistensymbole: 21 px, in der Leiste genau doppelt so groß */
  Object.keys(I).forEach(k => {
    const rows = I[k].filter((r, i, a) => !(/^\.+$/.test(r) && (i === 0 || i === a.length - 1))); const s = ART.buildSprite(rows);
    // alle Symbole auf eine gemeinsame Fläche von 14x14, damit sie gleich groß und scharf erscheinen
    const c = document.createElement('canvas'); c.width = 14; c.height = 14; c.getContext('2d').drawImage(s.c, Math.floor((14 - s.c.width) / 2), Math.floor((14 - s.c.height) / 2));
    out[k] = c.toDataURL(); cv[k] = c;
    ART.onRestore(() => { const g = c.getContext('2d'); g.clearRect(0, 0, 14, 14); g.drawImage(s.c, Math.floor((14 - s.c.width) / 2), Math.floor((14 - s.c.height) / 2)); });
  });
  out.canvas = cv;
  return out;
})();
