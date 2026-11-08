// Werkshof: Übersicht mit allen Gebäuden am Kanal
'use strict';
const SCENE = (() => {
  const { W, H, G, ROAD, WATER, VERGE, R, mk, mix, hx, rgb, blit, BUILD, SPR, skyAt, tint, glow, backdrop, ground, water, hillH, flies, parts, puff, stepParts } = ART;
  const scene = mk(W, H), sc = scene.getContext('2d');
  const layer = mk(W, H), lc = layer.getContext('2d');
  [sc, lc].forEach(g => g.imageSmoothingEnabled = false);

  // Lieferwagen: Kastenwagen mit Zahnrad-Logo, fährt durchs Tor auf den Hof
  const TRUCK = ART.buildSprite((() => {   // Kastenwagen: Koffer mit Verlauf und Kanten, Fahrerhaus mit spiegelnder Scheibe, runde Räder
    const g = ART.Grid(38, 19), { tn, sBox, sBall } = ART;
    sBox(g, 1, 1, 24, 12, ['S', 'I', 'H', 'J'], .55); g.rect(2, 2, 22, 1, 'J');                    // Kofferaufbau
    for (let x = 1; x < 25; x++) { g.set(x, 8, tn('teal', .45, x, 8)); g.set(x, 9, tn('teal', -.1, x, 9)); }   // Streifen
    sBall(g, 11, 4, 2.6, 2.6, 'gold'); g.set(11, 4, 'J'); g.set(11, 1, 'E'); g.set(11, 7, 'D'); g.set(8, 4, 'E'); g.set(14, 4, 'D');   // Zahnrad-Logo
    g.rect(17, 3, 1, 5, 'I'); g.rect(20, 3, 1, 5, 'I'); g.set(19, 6, 'g');                         // Türfugen, Griff
    sBox(g, 25, 4, 33, 13, 'teal', .4); g.rect(26, 3, 5, 1, 'Q');                                    // Fahrerhaus
    for (let y = 5; y < 9; y++) for (let x = 28; x < 33; x++) g.set(x, y, tn(['%', '&', 'A', 'B', 'J'], .9 - (y - 5) * .2 + ((x + y) % 5 === 0 ? .4 : 0), x, y)); g.rect(32, 5, 1, 4, 'O');   // Scheibe
    sBox(g, 33, 8, 36, 13, 'teal', .1); g.set(36, 9, 'F'); g.set(36, 10, 'G');                        // Motorhaube, Scheinwerfer
    g.rect(26, 10, 3, 1, 'O'); for (let x = 0; x < 38; x++) { g.set(x, 13, 'g'); g.set(x, 14, x % 4 ? 'h' : 'g'); } sBox(g, 35, 12, 37, 13, 'steel', .4);
    for (const cx of [7, 30]) { sBall(g, cx, 15, 3.4, 3.4, ['a', 'U', 'T', 'X', 'Y']); sBall(g, cx, 15, 1.6, 1.6, 'steel'); }
    return g.rows();
  })());
  const CRATE = ART.buildSprite(ART.relight(['cddc', 'deed', 'cddc']));
  const FENCE = ART.buildSprite(ART.relight(['E.E.E.E.E.E.E.E.E.E', 'EaEaEaEaEaEaEaEaEaE', 'aEaEaEaEaEaEaEaEaEa', 'h.h.h.h.h.h.h.h.h.h', 'h.h.h.h.h.h.h.h.h.h']));
  const LAMPPOST = ART.buildSprite(LAMPPOST_ROWS());

  // Kosmetik
  const DECO = {
    laterne: LAMPPOST_ROWS(),
    bank: ['eeeeeeeeeeee', 'dddddddddddd', 'c..........c', 'eeeeeeeeeeee', 'c..........c', 'b..........b'],
    blumen: ['.M.q.N.q.M.', 'MqNqMqNqMqN', 'oqopoqopoqo', 'cdddddddddc', 'cdcdcdcdcdc', 'bbbbbbbbbbb'],
    schild: ['bbbbbbbbbbbbbb', 'bEEEEEEEEEEEEb', 'bEFCFFCFCFFCEb', 'bEEEEEEEEEEEEb', 'bbbbbbbbbbbbbb', '..c........c..', '..c........c..', '..c........c..'],
    fass: ['.yzy..utu.', 'yAzzyuvuut', 'yzzzyuuuut', 'xxxxxsssss', 'yzzzyuuuut', '.yyy..ttt.'],
    brunnen: (() => { const g = ART.Grid(17, 15), { sBox } = ART;   /* Steinbrunnen: breites Becken, schlanke Säule, obere Schale; Wasserbögen fallen frei ins Becken */
      g.set(8, 0, 'B'); g.set(8, 1, 'A'); g.set(7, 1, 'B'); g.set(9, 1, 'B');
      g.rect(4, 2, 9, 1, 'j'); g.set(4, 2, 'l'); g.set(12, 2, 'h'); g.rect(5, 3, 7, 1, 'i'); g.set(5, 3, 'j'); g.set(11, 3, 'g'); g.rect(6, 4, 5, 1, 'h'); g.rect(6, 2, 5, 1, 'A'); g.set(7, 2, 'B');
      sBox(g, 7, 5, 9, 9, 'conc', .55);
      for (const [x, y] of [[3, 3], [2, 4], [2, 5], [1, 6], [1, 7]]) { g.set(x, y, y < 5 ? 'B' : 'A'); g.set(16 - x, y, y < 5 ? 'B' : 'A'); }
      g.rect(0, 9, 17, 1, 'j'); g.set(0, 9, 'l'); g.set(16, 9, 'h');
      for (let x = 1; x < 16; x++) g.set(x, 10, x < 4 ? 'B' : x < 8 ? 'A' : x < 12 ? 'z' : 'y'); g.set(1, 10, 'A'); g.set(6, 10, 'B'); g.set(13, 10, 'A'); g.set(0, 10, 'i'); g.set(16, 10, 'g');
      sBox(g, 0, 11, 16, 13, 'conc', .4); for (let x = 3; x < 16; x += 4) g.set(x, 12, 'h'); g.rect(1, 14, 15, 1, 'g');
      return g.rows(); })(),
    vogelhaus: ['..ttt..', '.tuuut.', 'tuuuuut', '.feaef.', '.eeeef.', '.ddddd.', '...c...', '...c...', '...c...', '...c...', '..ccc..'],
    kirschbaum: ['....NMN.N....', '..NMMNNMNMN..', '.MNNMHNNMMNM.', 'NMMNNMMNMNHMN', 'MNHMNMNNMNMMN', '.MNMMNLMNMNL.', '..LMNLMLMNL..', '....LMbLM....', '......cb.....', '......cb.....', '......cb.....', '.....ccbb....'],
    fahne: ['jPPPPPPQ', 'jPQQQQPQ', 'jPPEEPPQ', 'jPQQQQPP', 'jPPPPPPQ', 'j.......', 'j.......', 'j.......', 'j.......', 'j.......', 'j.......', 'j.......', 'j.......', 'j.......', 'j.......', 'j.......', 'j.......', 'h.......', 'hh......'],
    lichter: ['c.................c', 'cW...............Wc', 'c.a.V.........W.a.c', 'c...a..W...V..a...c', 'c.....a.a.a.a.....c', 'c.................c', 'c.................c', 'c.................c', 'c.................c', 'c.................c', 'b.................b']
  };
  function LAMPPOST_ROWS() { return ['...h...', '..ghg..', '.gghgg.', '.gWWWg.', '.gWGWg.', '.gWWWg.', '..ghg..', '...h...', '..hjh..', '...hg..', '...jg..', '...hg..', '...jg..', '...hg..', '...jg..', '...hg..', '..ghjg.', '...hg..', '...jg..', '..ghhg.', '.gghhgg', '.ggggg.']; }
  const DS = {}; Object.keys(DECO).forEach(k => DS[k] = ART.buildSprite(DECO[k]));
  DS.kirschbaum = SPR.cherryTree;
  const PETALS = [], CATST = {}, PINE_T = { c: mk(SPR.pineM.c.width, SPR.pineM.c.height), k: '' }; ART.onRestore(() => { PINE_T.k = ''; });   // getönte Tanne nur neu berechnen, wenn sich das Licht ändert   // fallende Kirschblüten
  // Vogel am Vogelhaus: fliegt ab und zu an, pickt auf dem Dach, fliegt weiter
  function bird(g, x, y, flap, peck, f) {   // f = 1: schaut nach links, -1: nach rechts
    const P = (dx, dy, c) => R(g, x + dx * f, y + dy, 1, 1, c);
    for (const dx of [-1, 0, 1]) { P(dx, 0, '#7f5236'); P(dx, 1, dx < 0 ? '#e0705a' : '#7f5236'); }
    P(-2, -1 + (peck ? 1 : 0), '#5c3a2e'); P(-1, -1 + (peck ? 1 : 0), '#5c3a2e'); P(-3, peck ? 1 : 0, '#e8a83a'); P(2, 0, '#5c3a2e');
    if (flap !== null) { P(0, flap ? -2 : 2, '#5c3a2e'); P(1, flap ? -2 : 2, '#5c3a2e'); } }
  // Turmdrehkran: Gittermast mit Kreuzverbänden, Ausleger und Gegenausleger mit Betonballast, Turmspitze mit Abspannungen, Führerhaus
  const CRANE = ART.buildSprite((() => { const g = ART.Grid(62, 50), { sBox } = ART, TX = 20;
    const ln = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) g.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); };
    for (let y = 12; y < 46; y++) { g.set(TX, y, 'E'); g.set(TX + 6, y, 'D'); }                                   // Mast: zwei Gurte
    for (let y = 12; y < 44; y += 6) { ln(TX, y, TX + 6, y + 6, 'D'); ln(TX + 6, y, TX, y + 6, 'C'); g.set(TX + 1, y, 'E'); for (let x = TX; x <= TX + 6; x++) g.set(x, y, 'D'); }   // Kreuzverbände
    sBox(g, TX - 4, 46, TX + 10, 49, 'conc');                                                                         // Fundament
    for (let x = 4; x < 61; x++) { g.set(x, 8, 'E'); g.set(x, 11, x < TX ? 'D' : 'C'); }                             // Ausleger + Gegenausleger: Ober- und Untergurt
    for (let x = 4; x < 60; x += 3) ln(x, 8, x + 3, 11, x % 2 ? 'D' : 'C');
    g.set(60, 9, 'E'); g.set(60, 10, 'D');
    for (let i = 0; i < 3; i++) sBox(g, 4 + i * 4, 12, 7 + i * 4, 18, 'conc', .2 + i * .05);                       // Betonballast
    ln(TX + 2, 0, TX + 2, 8, 'D'); ln(TX + 4, 0, TX + 4, 8, 'E'); g.set(TX + 3, 0, 'u');                          // Turmspitze mit Warnlicht
    ln(TX + 4, 1, 52, 8, 'g'); ln(TX + 2, 1, 5, 8, 'g');                                                              // Abspannungen
    sBox(g, TX + 7, 12, TX + 12, 17, 'gold', .5); for (let y = 13; y < 16; y++) for (let x = TX + 9; x <= TX + 11; x++) g.set(x, y, y === 13 ? 'B' : 'A');   // Führerhaus mit Scheibe
    for (let x = TX - 2; x <= TX + 8; x++) g.set(x, 12, 'X');                                                         // Drehkranz
    const see = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g.get(x, y) === '.') g.set(x, y, ','); };   // Gitter durchsichtig, Seile ohne Umriss
    see(TX + 1, 13, TX + 5, 45); see(TX + 7, 18, TX + 12, 45); see(13, 9, 59, 10); see(TX - 3, 13, TX - 1, 45); see(5, 1, 59, 7); see(16, 12, TX - 1, 18);
    return g.rows(); })());
  const STATUE = ART.buildSprite((() => { const g = ART.Grid(15, 19), { sBox } = ART, cx = 7, cy = 6.5;   /* goldenes Zahnrad auf der Kante, mit 8 Zähnen und Nabe, auf Steinsockel */
    const tone = (l, x, y) => ['C', 'D', 'E', 'F', 'G'][Math.max(0, Math.min(4, Math.floor((l + .2) * 3.6 + ((x + y) % 2 ? .25 : 0))))];
    for (let y = 0; y < 14; y++) for (let x = 0; x < 15; x++) { const dx = x + .5 - cx - .5, dy = y + .5 - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), tooth = Math.cos(a * 8) > .25;
      const R0 = tooth ? 6.6 : 5.2; if (r > R0) continue; if (r < 2.2 && r > 1.1) { g.set(x, y, 'C'); continue; } if (r <= 1.1) continue;
      let l = .5 - dx * .09 - dy * .1; if (r > R0 - 1) l -= .35; if (r < 3.2) l += .25; g.set(x, y, tone(l, x, y)); }
    g.set(cx, 6, '.'); g.set(cx + 1, 6, '.');
    sBox(g, 5, 13, 9, 15, 'conc', .5); sBox(g, 3, 16, 11, 17, 'conc', .4); sBox(g, 2, 18, 12, 18, 'conc', 0); return g.rows(); })());
  const TOWER = ART.buildSprite((() => { const g = ART.Grid(20, 48), ln = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) g.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); };   /* Aussichtsturm aus Holz: gespreizte Beine mit Kreuzstreben, Leiter, Plattform mit Geländer, rotes Spitzdach mit Fahne */
    g.set(10, 0, 'h'); g.set(10, 1, 'h'); g.rect(11, 0, 3, 2, 'u'); g.set(11, 0, 'v');   /* Fähnchen */
    for (let y = 2; y < 9; y++) { const hw = Math.round(1 + (y - 2) * 1.45); for (let x = 10 - hw; x <= 9 + hw; x++) g.set(x, y, y === 8 ? 's' : x < 10 - hw + 2 ? 'v' : x > 7 + hw ? 's' : (x + y) % 4 === 0 ? 't' : 'u'); }   /* Dach mit Schindelstruktur, links Licht */
    g.rect(1, 9, 18, 1, 'a');   /* Schatten unter der Traufe */
    for (const x of [2, 17]) g.rect(x, 9, 1, 8, x === 2 ? 'd' : 'b');   /* Eckpfosten */
    g.rect(3, 10, 14, 6, 'a'); g.rect(3, 10, 14, 1, 'U'); for (let x = 4; x < 16; x += 3) g.rect(x, 12, 1, 3, 'c');   /* dunkles Inneres mit Geländerstäben */
    g.rect(2, 12, 16, 1, 'e'); g.rect(2, 13, 16, 1, 'c');   /* Geländer */
    g.rect(1, 16, 18, 1, 'e'); g.rect(1, 17, 18, 1, 'c'); g.rect(2, 18, 16, 1, 'a');   /* Plattformboden mit Kante */
    const L0 = y => 4 - (y - 19) * 3 / 27, R0 = y => 15 + (y - 19) * 3 / 27;
    for (let y = 19; y < 46; y++) { const l = Math.round(L0(y)), r = Math.round(R0(y)); g.set(l, y, 'd'); g.set(l + 1, y, 'c'); g.set(r, y, 'c'); g.set(r - 1, y, 'b'); }   /* Beine */
    for (const [y0, y1] of [[20, 29], [29, 38], [38, 45]]) { ln(Math.round(L0(y0)) + 2, y0, Math.round(R0(y1)) - 2, y1, 'b'); ln(Math.round(R0(y0)) - 2, y0, Math.round(L0(y1)) + 2, y1, 'b'); g.rect(Math.round(L0(y1)) + 1, y1, Math.round(R0(y1)) - Math.round(L0(y1)) - 1, 1, 'c'); }   /* Kreuzstreben und Riegel */
    for (let y = 19; y < 46; y++) { g.set(8, y, 'e'); g.set(11, y, 'c'); if (y % 3 === 0) g.rect(9, y, 2, 1, 'd'); }   /* Leiter */
    for (const x of [1, 16]) { g.rect(x, 46, 3, 2, 'h'); g.rect(x, 46, 3, 1, 'j'); }   /* Betonfüße */
    return g.rows(); })());
  // Gabelstapler (größer, so hoch wie ein Mensch): Fahrer unter dem Schutzdach, Gegengewicht, Hubmast, Gabel mit Palette und Kiste
  const mkFork = full => ART.buildSprite((() => { const g = ART.Grid(28, 20), { sBox, sBall } = ART;   /* full: mit Fahrer und Ladung; nachts geparkt leer */
    sBox(g, 0, 8, 5, 15, ['C', 'D', 'D', 'E'], .2);                                                                  // Gegengewicht
    sBox(g, 3, 10, 16, 15, 'gold', .45); g.rect(6, 11, 6, 1, 'C'); g.set(15, 11, 'G');                              // Rahmen mit Scheinwerfer
    for (let y = 1; y < 10; y++) { g.set(4, y, 'g'); g.set(14, y, 'h'); } g.rect(3, 0, 13, 2, 'T'); g.rect(3, 0, 13, 1, 'Y'); g.set(5, 0, 'v');   // Schutzdach mit Rundumleuchte
    if (full) { g.rect(8, 3, 3, 2, 'F'); g.rect(8, 2, 3, 1, 'E'); g.set(10, 4, 'R'); g.set(10, 5, 'R'); g.rect(8, 6, 3, 4, 'y'); g.set(11, 7, 'R'); } else { g.rect(7, 6, 2, 3, 'a'); g.set(7, 6, 'b'); } g.rect(6, 8, 2, 2, 'a');   // Fahrer mit Helm (oder leere Sitzlehne), Sitz   // Fahrer mit Helm, Sitz
    g.rect(11, 8, 2, 1, 'a'); g.set(12, 7, 'a');                                                                     // Lenkrad
    for (let y = 0; y < 17; y++) { g.set(17, y, 'X'); g.set(18, y, 'Z'); } g.rect(17, 0, 2, 1, 'T');               // Hubmast
    g.rect(19, 9, 1, 7, 'g'); g.rect(19, 16, 8, 1, 'g'); g.rect(19, 17, 8, 1, 'h');                                 // Gabelträger und Zinken
    if (full) { g.rect(20, 14, 7, 2, 'c'); g.rect(20, 14, 7, 1, 'd'); g.set(23, 15, 'b');                                       // Palette
    sBox(g, 20, 8, 26, 13, ['b', 'c', 'd', 'e'], .5); g.rect(20, 10, 7, 1, 'b'); g.set(23, 9, 'u'); }                 // Kiste
    sBall(g, 4, 16.5, 2.6, 2.6, ['a', 'a', 'g', 'h']); sBall(g, 13.5, 16, 3.2, 3.2, ['a', 'a', 'g', 'h']); g.set(4, 16, 'i'); g.set(13, 16, 'i');   // Räder
    return g.rows(); })());
  const FORK = mkFork(true), FORK_E = mkFork(false);
  // großer Farn: gebogene Wedel mit Fiederblättchen
  const FERN = ART.buildSprite((() => { const g = ART.Grid(24, 15), cols = ['n', 'o', 'p', 'q'];
    [-1.35, -.9, -.45, 0, .45, .9, 1.35].forEach((a, k) => { const L = 11 - Math.abs(a) * 2; for (let t = 0; t <= L; t += .5) { const bend = (t / L) ** 2 * 3 * Math.sign(a || .1), x = Math.round(12 + Math.sin(a) * t + bend * .6), y = Math.round(14 - Math.cos(a) * t + Math.abs(Math.sin(a)) * (t / L) ** 2 * 4); g.set(x, y, cols[1]); if (t % 1 === 0 && t > 1) { g.set(x - 1, y - (k % 2), cols[2 + (t % 2)]); g.set(x + 1, y + (k % 2) - 1, cols[2]); } } });
    g.rect(10, 13, 5, 2, 'n'); return g.rows(); })());
  // Bestenliste: Holztafel auf zwei Pfosten, dunkelgrünes Feld mit goldenem Siegerpodest und Namenszeilen
  const RANKB = ART.buildSprite((() => { const g = ART.Grid(18, 20), { sBox } = ART;
    for (const x of [2, 15]) { g.rect(x, 9, 1, 11, 'c'); g.rect(x + 1, 9, 1, 11, 'b'); }
    sBox(g, 0, 0, 17, 13, ['b', 'c', 'd', 'e'], .45); g.rect(2, 2, 14, 10, 'n'); g.rect(2, 2, 14, 1, 'm');
    g.rect(7, 4, 3, 5, 'F'); g.rect(8, 3, 1, 1, 'G'); g.rect(4, 6, 3, 3, 'j'); g.rect(10, 7, 3, 2, 'D'); g.rect(4, 9, 9, 1, 'E');   // Podest 1-2-3
    for (const y of [4, 6, 8]) g.rect(14, y, 1, 1, 'q');
    g.rect(0, 14, 18, 1, 'b'); return g.rows(); })());
  const CAT = ART.buildSprite(['i...i..', 'ijjji..', 'jAjAj.j', 'jjjjjjj', '.j.j.j.']);
  Object.assign(DS, { turm: TOWER, stapler: FORK, kran: CRANE, statue: STATUE, katze: ART.robocat(1).sit[1] });   // Vorschaubilder im Katalog
  // Deko-Plätze: hinten am Gehweg und vorne auf dem Grünstreifen (Tiefe)
  const SLOTS = [[18, G + 13], [152, G + 14], [236, G + 15], [306, G + 20], [12, 147], [70, 151], [158, 151], [236, 151], [306, 150], [362, 148]].map(([x, b]) => ({ x, b }));
  // Steg: Bohlen mit Fugen und Glanzkante, Querbalken, Pfähle mit Eisenringen; Ruderboot mit Rudern
  const STEG = ART.buildSprite((() => { const g = ART.Grid(52, 14);
    g.rect(0, 0, 52, 1, 'f'); for (let x = 0; x < 52; x++) { g.set(x, 1, x % 5 === 4 ? 'c' : 'e'); g.set(x, 2, x % 5 === 4 ? 'c' : (x % 5 === 0 ? 'e' : 'd')); }
    g.rect(0, 3, 52, 1, 'c'); g.rect(0, 4, 52, 1, 'b');
    for (const x of [2, 18, 33, 48]) { g.rect(x, 5, 2, 9, 'c'); g.rect(x + 1, 5, 1, 9, 'b'); g.rect(x, 8, 2, 1, 'h'); g.rect(x, 12, 2, 2, 'n'); }
    g.set(10, 0, 'h'); g.set(11, 0, 'j'); g.set(40, 0, 'h'); g.set(41, 0, 'j'); return g.rows(); })());
  const tintCv = mk(64, 32), tintG = tintCv.getContext('2d');
  function tinted(ctx, sp, x, y, a) { tintG.clearRect(0, 0, 64, 32); tintG.globalCompositeOperation = 'source-over'; tintG.drawImage(sp.c, 0, 0); if (a > .01) { tintG.globalCompositeOperation = 'source-atop'; tintG.globalAlpha = a; tintG.fillStyle = '#0b1030'; tintG.fillRect(0, 0, 64, 32); tintG.globalAlpha = 1; tintG.globalCompositeOperation = 'source-over'; } ctx.drawImage(tintCv, 0, 0, sp.c.width, sp.c.height, x, y, sp.c.width, sp.c.height); }
  let stopAng = 0, PROMC = null, ANG = null;
  const PIER = ART.buildSprite((() => { const g = ART.Grid(12, 22);   // kurzer Steg, zwei Pfähle am Ende reichen bis auf den Grund
    for (let y = 0; y < 13; y++) { const w = 10, x0 = 1; for (let x = x0; x < x0 + w; x++) g.set(x, y, y % 3 === 2 ? 'c' : (x === x0 ? 'f' : x === x0 + w - 1 ? 'c' : y % 3 === 0 ? 'e' : 'd')); }
    for (const x of [1, 10]) { for (let y = 10; y < 17; y++) g.set(x, y, y < 13 ? 'c' : (y % 3 ? 'b' : 'a')); g.set(x, 14, 'h'); }
    return g.rows(); })());
  // Raddampfer (fährt nach rechts): geschwungener Rumpf mit Sprung zum Bug, Bullaugen, weißes Deck mit Fensterband,
  // Radkasten mit gemalten Strahlen (das Rad selbst steckt im Kasten), Steuerhaus vorn, Schornstein mit rotem Ring, Flagge am Heck
  const STEAMER = ART.buildSprite((() => { const g = ART.Grid(50, 26), { sBox, tn } = ART, NAVY = ['U', 'x', 'y', 'z', 'A'], WH = ['I', 'H', 'H', 'J', 'J'];
    // Rumpf: Deckslinie steigt zum Bug (rechts) an, Kiel rundet sich
    const deck = x => 17 - Math.round(Math.max(0, x - 38) * .35) + (x < 4 ? 1 : 0);
    for (let x = 1; x < 49; x++) { const top = deck(x), bot = 24 - (x < 4 ? 3 - x : 0) - (x > 43 ? Math.round((x - 43) * .9) : 0);
      for (let y = top; y <= bot; y++) { let l = .55 - (y - top) / Math.max(1, bot - top) * .6; if (y === top) l += .4; g.set(x, y, tn(NAVY, l, x, y)); }
      if (bot >= 22) { g.set(x, 22, 't'); g.set(x, 23, 's'); } if (bot >= 24) g.set(x, 24, 's');
      g.set(x, top, 'J'); }                                                                                                       // weiße Scheuerleiste
    for (let x = 8; x < 44; x += 5) { if (x > 15 && x < 26) continue; g.set(x, 19, 'B'); g.set(x + 1, 19, 'A'); }                   // Bullaugen
    // Hauptdeck: Kabine mit Fensterband und Tür
    sBox(g, 5, 11, 39, 16, WH, .45); for (let x = 7; x < 38; x += 3) { if (x > 14 && x < 27) continue; g.set(x, 13, '%'); g.set(x + 1, 13, '&'); g.set(x, 14, '%'); g.set(x + 1, 14, '%'); }
    g.rect(35, 13, 2, 3, 'c'); g.rect(5, 10, 35, 1, 'b');                                                                       // Tür, Deckskante
    // Oberdeck: Reling, Steuerhaus vorn, Sonnendach
    for (let x = 6; x < 39; x++) if (x % 2 === 0) g.set(x, 8, 'j'); g.rect(6, 9, 33, 1, 'j');
    sBox(g, 29, 4, 38, 9, WH, .5); g.rect(31, 6, 2, 2, '%'); g.rect(34, 6, 3, 2, '%'); g.set(34, 6, '&'); g.rect(28, 3, 12, 1, 'c'); g.rect(28, 2, 12, 1, 'd');
    // Schornstein (leicht nach hinten geneigt): creme, roter Ring, schwarze Kappe
    for (let y = 0; y < 9; y++) { const x0 = 20 - Math.floor((9 - y) / 4); for (let x = x0; x < x0 + 4; x++) g.set(x, y, y < 2 ? 'U' : y === 3 ? 'u' : tn(['S', 'I', 'H', 'J'], .7 - (x - x0) * .25, x, y)); }
    // Radkasten: Halbkreis, rote Kante, gemalte Strahlen, goldenes Namensschild
    for (let y = -8; y <= 0; y++) for (let x = -8; x <= 8; x++) { const d = x * x + y * y; if (d > 64) continue; g.set(20 + x, 17 + y, d > 49 ? 'u' : tn(WH, .55 - (x + 8) * .03 + y * .01, 20 + x, 17 + y)); }
    for (let y = -6; y <= 0; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) g.set(20 + x, 17 + y, (x * x + y * y > 30) ? 'J' : 'U');   // offener Radkasten, das Rad dreht sich darin
    g.rect(16, 16, 9, 1, 'E'); g.rect(17, 16, 7, 1, 'F'); g.rect(12, 17, 17, 1, 'u');
    // Flagge am Heck
    for (let y = 3; y < 11; y++) g.set(3, y, 'b'); g.rect(0, 3, 3, 2, 'u'); g.set(1, 4, 'J');
    return g.rows(); })());
  const PBENCH = ART.buildSprite(['eeeeeeeeeee', 'cdddddddddc', 'b.........b', 'eeeeeeeeeee', 'cdddddddddc', 'b.b.....b.b', 'a.a.....a.a']);
  const BOAT = ART.buildSprite(['........c.....c..', '.........c...c...', 'feeeeeeeeeeeeeed..', '.dcdcdcdcdcdcdcb..', '..bbbbbbbbbbbbb...']);
  const PLANTER = ART.buildSprite(['.p.q.N.q.M.p.', 'oqopMqopqNoqo', 'nonoonnonoono', 'cdddddddddddc', 'bcccccccccccb']);
  // Positionen im Werkshof (Mitte x, Unterkante)
  const POS = {
    tor: { x: 34 }, pfoertner: { x: 66 }, blechwerkstatt: { x: 118, front: 1 },
    maschinenhalle: { x: 194 }, prueflabor: { x: 270, front: 1 }, kraftwerk: { x: 354 }, golem: { x: 334 }, turm: { x: 11 }, statue: { x: 196 }, kran: { x: 120 }
  };
  // vordere Gebäude stehen direkt an der Kaimauer und spiegeln sich im Wasser
  Object.values(POS).forEach(p => p.b = p.front ? ART.PROM + 1 : hillH[p.x]);
  const HIT = {}; // Klickflächen
  const VERGE_B = 157;

  // Kaisockel unter den Gebäuden am Wasser: Natursteinquader, Moos an der Wasserlinie, Poller
  function kai(g, cx, w, k) { // niedriger Steinsockel, die Tür öffnet sich zur Promenade
    const x0 = Math.round(cx - w / 2) - 2, ww = w + 4, y0 = ART.PROM - 2;
    R(g, x0, y0, ww, 3, '#8f8a92'); R(g, x0, y0, ww, 1, '#b5afb0'); for (let x = x0 + 3; x < x0 + ww; x += 6) R(g, x, y0 + 1, 1, 2, '#6b6672');
    g.globalAlpha = .25; R(g, x0, ART.PROM + 1, ww, 2, '#3e2731'); g.globalAlpha = 1;
  }
  // Schilf an der Kaimauer und Seerosen (wiegen sich leicht)
  const REEDS = []; [[2, 22], [52, 86], [150, 176], [206, 228], [372, 384]].forEach(([a, b], k) => { for (let x = a; x < b; x += 2 + ((x * 7 + k) % 3)) REEDS.push({ x, h: 3 + ((x * 13) % 4), cat: (x * 5) % 9 < 2, p: x * .37 }); });
  const LILY = [{ x: 14, y: WATER + 10, n: 3, p: 1 }, { x: 370, y: WATER + 12, n: 3, p: 4 }, { x: 262, y: WATER + 8, n: 2, fl: true, p: 2.5 }];   // zwei Dreiergruppen am Rand, eine Zweiergruppe mit Blüte am Ufer
  function reeds(g, time, k) {
    const c1 = rgb(mix(hx('#467a42'), k.tree, .2)), c2 = rgb(mix(hx('#9cc65a'), k.tree, .25)), cb = '#7f5236';
    for (const r of REEDS) { const sway = Math.sin(time * .9 + r.p) * 1.2; for (let j = 0; j < r.h; j++) { const x = Math.round(r.x + sway * j / r.h); R(g, x, WATER - 1 - j, 1, 1, j > r.h - 3 ? c2 : c1); }
      if (r.cat) { const x = Math.round(r.x + sway); R(g, x, WATER - r.h - 3, 1, 3, cb); R(g, x, WATER - r.h - 4, 1, 1, c2); } else R(g, Math.round(r.x - 1 + sway * .5), WATER - 3, 1, 2, c1); }
  }
  function lilies(g, time, k) {
    const lc1 = rgb(mix(hx('#467a42'), k.water, .25)), lc2 = rgb(mix(hx('#6a9e4c'), k.water, .15));
    const nf = 1 - k.night * .55, sh = c => rgb(mix(hx(c), k.water, .08 + k.night * .4)), cO = rgb(mix(hx('#1f3a2f'), k.water, .35)), cL = sh('#8cbf55'), cM = sh('#5c9a42'), cD = sh('#3c7838'), wt = rgb(k.water);
    // Seerosenblatt: rundes, flaches Blatt mit dunklem Rand, heller Oberkante und keilförmiger Kerbe; Blüte mit spitzen Blättern und gelber Mitte
    const pad = (x, y, w, flip) => { const h = Math.max(2, Math.round(w / 2.4)), s = flip ? -1 : 1;
      for (let j = -1; j <= h; j++) { const t = (j + .5) / h * 2 - 1, hw = Math.round((w / 2 + (j < 0 || j === h ? -1 : 1)) * Math.sqrt(Math.max(0, 1 - t * t))); if (j < 0 || j === h) { R(g, x - hw, y + j, hw * 2 + 1, 1, cO); continue; }
        R(g, x - hw - 1, y + j, 1, 1, cO); R(g, x + hw + 1, y + j, 1, 1, cO); R(g, x - hw, y + j, hw * 2 + 1, 1, j === 0 ? cL : j === h - 1 ? cD : cM); }
      if (w > 4) R(g, x + s, y, 1, 1, wt); };   /* kleine Kerbe */
    const flower = (x, y) => { g.globalAlpha = nf; R(g, x - 1, y, 3, 1, '#d9709a'); R(g, x - 1, y - 1, 1, 1, '#f2a8c0'); R(g, x + 1, y - 1, 1, 1, '#f2a8c0'); R(g, x, y - 2, 1, 1, '#fffaf0'); R(g, x, y - 1, 1, 1, '#f7d86a'); g.globalAlpha = 1; };   /* kleine Blüte */
    for (const l of LILY) { const x = Math.round(l.x + Math.sin(time * .4 + l.p) * 1.2), y = l.y; pad(x + 6, y + 2, 4, l.p < 3); if (l.n > 2) pad(x - 5, y + 1, 4, true); pad(x, y, 6, l.p > 3); if (l.fl) flower(x - 1, y);   /* passend zu den Figuren: deutlich kleiner */ }
  }
  // gesperrt: Gebäude verschwimmt im Dunst (Farbe des Horizonts)
  const hazeC = {};
  function hazed(s, k) {   // leichter Dunst für Dinge weiter hinten
    const key = rgb(mix(k.bot, k.far, .35)); if (hazeC[key]) return hazeC[key];
    const c = mk(s.c.width, s.c.height), g = c.getContext('2d'); g.drawImage(s.c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .22; g.fillStyle = key; g.fillRect(0, 0, c.width, c.height);
    return (hazeC[key] = c);
  }
  function fogged(s, k) {
    const c = mk(s.c.width, s.c.height), g = c.getContext('2d');
    g.drawImage(s.c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .78; g.fillStyle = rgb(mix(k.bot, k.far, .35)); g.fillRect(0, 0, c.width, c.height);
    return Object.assign({}, s, { c, win: [] });
  }

  // ---------- Riesen-Mecha im Werkshof (nach dem Bau) ----------
  const ease = q => q * q * (3 - 2 * q), lerp = (a, b, q) => a + (b - a) * q;
  const hillY = x => hillH[Math.max(0, Math.min(W - 1, Math.round(x)))] + 2;
  const FX = [];   // Splitter, Gesteinsbrocken (eigene kleine Teilchen)
  function fxBurst(x, y, n, cols, sp, up) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (.4 + Math.random() * .6); FX.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (up || 0), c: cols[i % cols.length], life: 0, max: .8 + Math.random() * .8, g: 60 }); } }
  function fxStep(g, dt) { for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.life += dt; if (f.life > f.max) { FX.splice(i, 1); continue; } f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt; g.globalAlpha = Math.min(1, (1 - f.life / f.max) * 2); R(g, Math.round(f.x), Math.round(f.y), 1, 1, f.c); } g.globalAlpha = 1; }
  // Katapult aus Holz (blickt nach rechts): Rahmen, Räder, Wurfarm mit Schale
  function catapult(g, x, b, roll, arm, loaded) {
    const wd = '#7f5236', wl = '#a5703f', dk = '#3e2731';
    const ln = (x0, y0, x1, y1, c) => { const n2 = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n2; i++) R(g, Math.round(x0 + (x1 - x0) * i / n2), Math.round(y0 + (y1 - y0) * i / n2), 1, 1, c); };
    const thick = (x0, y0, x1, y1) => { ln(x0, y0 + 1, x1, y1 + 1, dk); ln(x0, y0, x1, y1, wd); ln(x0, y0 - 1, x1, y1 - 1, wl); };
    thick(x - 4, b - 7, x - 1, b - 17); thick(x + 4, b - 7, x + 1, b - 17); R(g, x - 3, b - 18, 7, 2, dk); R(g, x - 2, b - 18, 5, 1, wl);   // A-Gestell mit Achse
    R(g, x - 16, b - 9, 32, 4, dk); R(g, x - 15, b - 8, 30, 2, wd); R(g, x - 15, b - 8, 30, 1, wl); R(g, x + 12, b - 15, 2, 7, dk); R(g, x + 11, b - 16, 4, 2, '#5c3a2e');   // Rahmen und Prellbalken
    const px = x, py = b - 17, ex = px + Math.cos(arm) * 17, ey = py + Math.sin(arm) * 17; thick(px, py, ex, ey);
    R(g, Math.round(ex) - 2, Math.round(ey) - 2, 5, 3, dk); R(g, Math.round(ex) - 1, Math.round(ey) - 2, 3, 1, wl);   // Schale
    if (loaded) { R(g, Math.round(ex) - 2, Math.round(ey) - 5, 4, 3, '#6b6672'); R(g, Math.round(ex) - 1, Math.round(ey) - 5, 2, 1, '#b5afb0'); }
    for (const wx of [x - 10, x + 10]) { for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const d = xx * xx + yy * yy; if (d <= 11) R(g, wx + xx, b - 4 + yy, 1, 1, d > 6 ? dk : '#5c3a2e'); }
      for (let k = 0; k < 2; k++) { const a = roll + k * Math.PI / 2; R(g, Math.round(wx + Math.cos(a) * 2), Math.round(b - 4 + Math.sin(a) * 2), 1, 1, '#cf9a5c'); R(g, Math.round(wx - Math.cos(a) * 2), Math.round(b - 4 - Math.sin(a) * 2), 1, 1, '#cf9a5c'); } }
  }
  function debris(g, x, b) {   // Trümmer des Katapults: Balken kreuz und quer, ein Rad, die Schale
    const pl = (x0, y0, w, h, c) => { R(g, x0 - 1, y0 - 1, w + 2, h + 2, '#3e2731'); R(g, x0, y0, w, h, c); R(g, x0, y0, w, 1, '#a5703f'); };
    pl(x - 12, b - 3, 18, 2, '#7f5236'); pl(x - 4, b - 6, 14, 2, '#7f5236'); pl(x - 9, b - 9, 2, 7, '#5c3a2e'); pl(x + 6, b - 10, 2, 8, '#7f5236');
    for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 1; xx++) { const d = xx * xx + yy * yy; if (d <= 11) R(g, x + 12 + xx, b - 4 + yy, 1, 1, d > 6 ? '#3e2731' : '#5c3a2e'); }
    R(g, x - 15, b - 4, 4, 3, '#3e2731'); R(g, x - 14, b - 4, 2, 1, '#a5703f'); R(g, x + 2, b - 2, 3, 2, '#6b6672'); R(g, x - 6, b - 1, 2, 1, '#8f8a92');
  }
  let SL = null, MEI = null, KS = {}; const YM = {}, KR = {}, NB = {}, DK = {}, VG = {}, RB = {}, FK = {}, OW = { p: 0 }, PC = mk(W, H), PG = PC.getContext('2d'); const FRONTS = [], CONE = mk(W, H), CG = CONE.getContext('2d');   /* Lichtkegel getrennt zeichnen, damit Gebäude davor ihn verdecken */
  // state: { b: {id: 'ruin'|'ok'|'locked'}, golem, running: {id: n}, truck: Anzahl Kisten, owned, placed, marks }
  function yard(ctx, st, t, time, dt) {
    const k = skyAt(t), n = k.night, work = n < .55, lunch = t > .45 && t < .52 && n < .2, nightW = n > .6;   /* Tagesablauf draußen: Schicht, Mittagspause, Nachtruhe */
    const { sunPos, moonPos } = backdrop(sc, k, G + 2, time, t);
    sc.drawImage(ART.cachedLayer('ground', H, ART.kq(k.grass, k.bot, k.tree, k.water, k.shore, k.night, k.tint), g => ground(g, k, g2 => { const tk = k.tint.map(v => Math.round(v * 20)).join(','); if (PINE_T.k !== tk) { PINE_T.k = tk; const pg = PINE_T.c.getContext('2d'); pg.clearRect(0, 0, PINE_T.c.width, PINE_T.c.height); pg.drawImage(SPR.pineM.c, 0, 0); tint(pg, PINE_T.c.width, PINE_T.c.height, k.tint); } const pc = PINE_T.c; blit(g2, Object.assign({}, SPR.pineM, { c: pc }), 320, hillH[320] - 2); })), 0, 0);   // Tanne hinter Treppe und Geländer, tiefer gesetzt (kurzer Stamm)   /* Boden aus dem Zwischenbild */
    {   // Geräusche im Werkshof: Vögel am Tag, Grillen in der Nacht, leises Wasserplätschern
      const day = t > .22 && t < .8 && n < .3; if (day && Math.random() < dt * .28) SFX.play('chirp', { pan: Math.random() * 1.4 - .7, vol: .8, gap: .5 });
      SFX.hum('water', .07); if (n > .5) { SFX.hum('wind', (n - .5) * .5); SFX.hum('crickets', (n - .5) * .17); } }   /* Fluss leise; nachts leiser Wind und ein sanft schwellender Grillenteppich */
    for (const [i, tw] of [[0, .28], [1, .45], [2, .70]]) { const on = t > tw && t < tw + .004; SFX.edge('shift' + i, on, 'shift', { vol: .9 }); if (on && HIT.maschinenhalle && st.b.maschinenhalle === 'ok' && Math.random() < .6) puff(HIT.maschinenhalle.x + 8, HIT.maschinenhalle.y + 2, 'smoke'); }   /* Werkspfeife mit Dampfwolke: Schichtbeginn, Mittag, Feierabend */
    lc.clearRect(0, 0, W, H); const L = [], D = [], FREE = [], FOG = []; FRONTS.length = 0;   // D: Dinge im Hof, nach Tiefe (Unterkante) sortiert
    const add = (y, f) => D.push({ y, f });
    const watch = c => c.forEach((a, i) => { a.st = 'act'; a.act = (st.fw > 3 && (i + Math.floor(time * .8)) % 3 === 0) ? 'wave' : 'idle'; a.face = 226 - a.x >= 0 ? 1 : -1; a.t = Math.max(a.t, 4 + i); });   /* Feuerwerk: alle bleiben stehen, drehen sich zum Mecha, manche winken */
    // ---- hintere Reihe: Bäume, Kran, Gebäude ----
    if (!st.owned.turm) blit(lc, SPR.pineL, 5, G + 1); blit(lc, SPR.pineM, 14, G + 1); 
    for (const key in HIT) if (key.startsWith('fx_')) delete HIT[key];   // Einmal-Gegenstände: anklickbar zum Wegräumen
    const fx = (id, o, s2) => { HIT['fx_' + id] = { x: o.x, y: o.y, w: (s2 || o.s).w, h: (s2 || o.s).h, fixed: id }; };
    if (st.owned.kran) {   // Kran steht hinten, die Laubbäume davor
      const o = blit(lc, CRANE, POS.kran.x, G + 1); HIT.fx_kran = { x: o.x + 18, y: o.y, w: 12, h: o.s.h, fixed: 'kran' };   // Laufkatze fährt den Ausleger entlang, Haken mit Stahlträger hebt und senkt sich
      if (work) KR.t = time; const ct = KR.t || 0;   /* nachts steht der Kran still, Haken oben */
      const q = (Math.sin(ct * .12) + 1) / 2, kx = Math.round(o.x + 30 + q * 26), hyT = (Math.sin(ct * .21) + 1) * 8 * (work ? 1 : 0); KR.h = KR.h === undefined ? hyT : KR.h + Math.max(-dt * 3, Math.min(dt * 3, hyT - KR.h)); const hy = Math.round(o.y + 22 + KR.h);   /* Haken fährt langsam hoch statt zu springen */
      if (work) SFX.hum('motor', .12 * Math.max(Math.abs(Math.cos(time * .12)), Math.abs(Math.cos(time * .21))), SFX.panX(kx));
      if (n > .3 && Math.sin(time * 2.4) > .2) { R(lc, o.x + 23, o.y, 2, 1, '#ff5a4a'); L.push({ x: o.x + 23, y: o.y, w: 2, h: 1, c: '#ff5a4a', fire: true }); }   /* Warnlicht oben auf dem Kran */   /* Kranmotor surrt beim Fahren */
      R(lc, kx - 2, o.y + 11, 5, 2, '#3b3f4a'); R(lc, kx - 2, o.y + 11, 5, 1, '#8f8a92'); R(lc, kx, o.y + 13, 1, hy - o.y - 13, '#3e2731');
      R(lc, kx - 1, hy, 3, 2, '#e8a83a'); R(lc, kx, hy + 2, 1, 2, '#4a4652'); R(lc, kx - 5, hy + 4, 11, 2, '#b8474b'); R(lc, kx - 5, hy + 4, 11, 1, '#e0705a'); }
    blit(lc, SPR.cozyTree, 100, G + 1); blit(lc, SPR.cozyTree2, 141, G + 1); blit(lc, SPR.tallPine, 252, G + 1);   // hohe Tanne hinter dem Prüflabor
    [[336, G - 3], [370, G - 2]].forEach(([x, b]) => { if (!(st.trophy && x === 370)) blit(lc, SPR.bush, x, b); });   // Büsche auf dem Grashang, nicht auf dem Weg
    { const o = blit(lc, RANKB, 353, G - 1); HIT.rang = { x: o.x - 2, y: o.y - 2, w: o.s.w + 4, h: o.s.h + 4 }; L.push({ x: o.x + 7, y: o.y + 3, w: 3, h: 2, c: '#ffd56a', a: .5 }); }   // Bestenliste-Tafel am Hang: Klick öffnet die Rangliste
    if (st.owned.turm) fx('turm', blit(lc, TOWER, POS.turm.x, G + 1, L));
    const order = ['tor', 'pfoertner', 'blechwerkstatt', 'maschinenhalle', 'prueflabor', 'kraftwerk'];
    const drawB = (id, p, s) => {
      const o = blit(lc, s, p.x, p.b, st.b[id] === 'ok' ? L : null); ART.OCC.cover(s.c, o.x, o.y); if (p.front) FRONTS.push({ c: s.c, x: o.x, y: o.y });   /* Gebäude vorne verdeckt Personen dahinter: deren Aussparung im Lichtschein wieder schließen */
      HIT[id] = id === 'tor' ? { x: o.x, y: o.y, w: s.w, h: 16 } : { x: o.x, y: o.y, w: s.w, h: s.h };
      if (st.b[id] === 'ok') {
        (BUILD[id].def.chim || []).forEach(([cx, cy]) => { if (Math.random() < dt * (st.running[id] ? 3 : 1)) puff(o.x + cx + 1, o.y + cy - 1, 'smoke'); });
        (BUILD[id].def.lamp || []).forEach(([lx, ly]) => L.push({ x: o.x + lx, y: o.y + ly, w: 1, h: 1, c: '#ffd56a', fire: true }));
        if (BUILD[id].def.blink && Math.sin(time * 4) > 0) { const [bx, by] = BUILD[id].def.blink; L.push({ x: o.x + bx, y: o.y + by, w: 1, h: 1, c: '#ff5a4a', fire: true }); }
      }
      if (st.b[id] === 'bau') scaffold(id, p, (st.bauP || {})[id] || 0);
    };
    // Bauzeit: das renovierte Gebäude wächst von unten nach oben aus der Ruine, davor ein Holzgerüst mit Handwerkern
    const scaffold = (id, p, prog) => {
      const ok = BUILD[id].ok, x0 = Math.round(p.x) - Math.floor(ok.w / 2) - 1, yb = Math.round(p.b) - 1, hgt = ok.c.height, hh = Math.max(2, Math.round(hgt * (.12 + prog * .88)));
      lc.drawImage(ok.c, 0, hgt - hh, ok.c.width, hh, x0, yb - hh + 1, ok.c.width, hh);
      const left = x0 + 2, right = x0 + ok.c.width - 3, top = yb - hgt + 6;
      for (let x = left; x <= right; x += 9) { R(lc, x, top, 1, yb - top, '#7f5236'); R(lc, x + 1, top, 1, yb - top, '#5c3a2e'); }   // Stangen
      for (let y = top + 4; y < yb - 2; y += 10) { R(lc, left - 1, y, right - left + 3, 2, '#a5703f'); R(lc, left - 1, y, right - left + 3, 1, '#cf9a5c'); R(lc, left - 1, y + 2, right - left + 3, 1, '#3e2731'); }   // Bretter
      for (let x = left; x + 9 <= right; x += 18) for (let i = 0; i < 9; i++) R(lc, x + i, top + 4 + Math.round(i * 1.1), 1, 1, '#7f5236');   // Querstreben
      const lv = []; for (let y = top + 4; y < yb - 2; y += 10) lv.push(y);
      [[.3, 0, 3], [.7, 1, 7]].forEach(([fx, li, v], j) => { const y = lv[Math.min(lv.length - 1, li)], x = Math.round(left + (right - left) * fx), hit = Math.floor(time * 2.2 + j * .9) % 2;
        if (y === undefined) return; blit(lc, WORKERS.front(v)[hit ? 3 : 4], x, y, null, j === 1);
        SFX.edge('bauH' + id + j, hit === 1, 'hammer', { pan: SFX.panX(x), vol: .45 }); if (hit && Math.random() < .25) puff(x + (j ? -3 : 3), y - 8, 'spark'); });
      if (Math.random() < dt * 1.5) puff(left + Math.random() * (right - left), yb - 2, 'smoke');   // Baustaub
    };
    for (const id of order) {
      const p = POS[id]; let s = st.b[id] === 'ok' ? BUILD[id].ok : BUILD[id].ruin;
      if (p.front) add(p.b, () => { kai(lc, p.x, s.w, k); drawB(id, p, s); });
      else drawB(id, p, s);
    }
    if (st.golem) {
      // Leerlauf wie beim alten Golem (wiegt sich), nur lebendiger: atmet, pendelt mit dem Arm, schaut sich um, stampft ab und zu
      const ph = time * 3, bob = Math.sin(ph) > .3 ? 1 : 0, sway = Math.round(Math.sin(time * 1.1) * 1.2), swing = Math.round(Math.sin(ph - .6) * 1.6);
      const look = Math.sin(time * .45), head = look > .55 ? -1 : look < -.7 ? 1 : 0, stomp = (time % 7) > 6.3 ? 1 : 0;
      const S = SPR.golemFrame({ bob, head, swing, lift: stomp }); SFX.edge('golemStomp', stomp, 'step', { pan: SFX.panX(POS.golem.x), vol: .6 }); SFX.hum('reactor', .12, SFX.panX(POS.golem.x));
      const o = blit(lc, S, POS.golem.x + sway, hillH[POS.golem.x] + 2); const pulse = .55 + .45 * Math.sin(time * 3);
      S.fire.forEach(f => L.push({ x: o.x + f.x - 1, y: o.y + f.y - 1, w: f.w, h: f.h, c: f.h > 1 ? '#ff7a2c' : '#ffb04a', fire: true, a: f.h > 1 ? pulse : 1 }));
      if (Math.random() < dt * 1.5) puff(o.x + 23 + (Math.random() < .5 ? 0 : 3), o.y + 8 + bob, 'smoke');
      HIT.golem = { x: o.x, y: o.y, w: S.w, h: S.h };
    }
    else delete HIT.golem;

    // Riesen-Mecha: kommt alle 2,5 Minuten aus dem Kraftwerk, geht die Treppe hinunter, springt mit Düsen auf die Wiese und hält dort Wache
    // (nachts mit Suchscheinwerfer), danach zurück; kämpft einmal gegen das Katapult
    SL = null; delete HIT.ymecha;
    if (st.mecha) {
      const M = st.mecha, A = M.act, DOOR = 354, STB = 328, GX = 226, GB = ART.RCY - 4; let mx = null, mb = 0, jet = false, stand = false;
      const pose = { bob: 0, head: 0, lift: 0, rL: 0, rR: 0 };
      let side = null;   /* Gehen: Seitenansicht, side = Richtung (-1 links, 1 rechts) */
      const FD = .55, hw = x => hillH[Math.max(0, Math.min(W - 1, Math.round(x)))] - 1;   /* Dauer eines Schrittbilds; Höhe des Wegs vor dem Kraftwerk */
      let beam = null, birdsOn = null;   /* Suchscheinwerfer-Ziel; Vögel auf dem Arm */
      const walkPose = (dist, dir) => { const f = Math.floor(dist / 2); pose.step = ((f % 8) + 8) % 8; pose.heavy = 1; side = dir || -1;   /* Schrittbild aus der zurückgelegten Strecke: der stehende Fuß bleibt fest am Boden */
        if (pose.step % 4 === 0 && YM.lastStep !== f + ':' + dir) { YM.lastStep = f + ':' + dir; if (f > 0) { SFX.play('mstep', { pan: SFX.panX(mx || 340), vol: .8, gap: .2 }); for (let i = 0; i < 2; i++) puff((mx || 0) + (Math.random() - .5) * 10, (mb || 0) - 1, 'smoke'); } } };   /* schweres Auftreten: dumpfer Schritt, etwas Staub */
      const walkSeg = (t, x0, x1, y) => { const n = Math.round(Math.abs(x1 - x0) / 2), f = Math.max(0, Math.min(n, Math.floor(t / FD))), dir = Math.sign(x1 - x0) || -1; mx = x0 + dir * 2 * f; mb = y === undefined ? hw(mx) : y; walkPose(f * 2, dir); return n * FD; };
      let dep = null; const hop = (q, x0, b0, x1, b1, h) => { mx = lerp(x0, x1, ease(q)); mb = lerp(b0, b1, q) - Math.sin(q * Math.PI) * h; jet = true; dep = Math.max(b0, b1); };   /* fliegt in der Tiefe seines Ziels: hinter dem Prüflabor */
      if (st.kat !== undefined) {   // Katapult-Kampf
        const u = st.kat, LX = 234, CX = 166, B = ART.RCY - 2;
        if (u < 4) { mx = GX; mb = GB; stand = true; }
        else if (u < 5.5) hop((u - 4) / 1.5, GX, GB, LX, B, 14);
        else if (u < 8) { mx = LX; mb = B; stand = true; if (u > 7.5 && u < 7.9) pose.rR = 2; }
        else if (u < 10) { const d = Math.floor((u - 8) / 2 * (LX - CX - 24) / 2) * 2; mx = LX - d; mb = B; walkPose(d, -1); }   /* stürmt los: schnell, aber mit festen Füßen */
        else if (u < 11.5) { mx = CX + 24; mb = B; if (u < 10.6) { pose.rL = 2; pose.rR = 2; } else pose.bob = 1; }
        else if (u < 13.5) hop((u - 11.5) / 2, CX + 24, B, GX, GB, 18);
        else { mx = GX; mb = GB; stand = true; }
        const cxp = u < 4 ? lerp(60, CX, ease(u / 4)) : CX, roll = cxp / 3;
        const arm = u < 5.5 ? Math.PI * 1.1 : u < 6.5 ? Math.PI * (1.1 + .08 * ease((u - 5.5) / 1)) : u < 6.75 ? Math.PI * (1.18 + .45 * ease((u - 6.5) / .25)) : Math.PI * 1.63;
        if (u < 10.6) add(B, () => catapult(lc, Math.round(cxp), B, roll, arm, u < 6.7)); else add(B, () => debris(lc, CX, B));
        const ci = Math.floor(u * 1.6); if (u < 4 && KS.c !== ci) { KS.c = ci; SFX.play('creak', { pan: SFX.panX(cxp), vol: .7 }); }
        SFX.edge('kWind', u > 5.5 && u < 6.5, 'creak', { pan: SFX.panX(CX) }); SFX.edge('kFire', u > 6.6, 'whoosh', { pan: SFX.panX(CX) });
        if (u > 6.7 && u < 7.7) { const q = (u - 6.7) / 1, bx = lerp(CX + 6, LX - 8, q), by = B - 30 - Math.sin(q * Math.PI) * 26;   // Felsbrocken fliegt
          add(H, () => { R(lc, Math.round(bx) - 2, Math.round(by) - 2, 5, 4, '#3e2731'); R(lc, Math.round(bx) - 1, Math.round(by) - 2, 3, 3, '#6b6672'); R(lc, Math.round(bx) - 1, Math.round(by) - 2, 2, 1, '#b5afb0'); }); }
        if (u > 7.7 && !KS.rockDone) { KS.rockDone = 1; fxBurst(LX - 8, B - 30, 22, ['#6b6672', '#8f8a92', '#b5afb0', '#4a4652'], 40, 20); SFX.play('crash', { pan: SFX.panX(LX) }); }
        if (u > 10.6 && !KS.smash) { KS.smash = 1; fxBurst(CX, B - 8, 30, ['#7f5236', '#a5703f', '#5c3a2e', '#cf9a5c'], 45, 30); SFX.play('crash', { pan: SFX.panX(CX) }); SFX.play('wood', { pan: SFX.panX(CX) }); for (let i = 0; i < 6; i++) puff(CX - 12 + Math.random() * 24, B - 2, 'smoke'); }
        if (u < 1) KS = {};
        SFX.edge('kJ1', u > 4 && u < 5.5, 'mjet', { pan: SFX.panX(LX) }); SFX.edge('kL1', u > 5.5, 'mthud', { pan: SFX.panX(LX) }); SFX.edge('kJ2', u > 11.5 && u < 13.5, 'mjet', { pan: SFX.panX(CX) }); SFX.edge('kL2', u > 13.5, 'mthud', { pan: SFX.panX(GX), vol: .6 });
        if (u > 5.5 && u < 5.7) for (let i = 0; i < 3; i++) puff(LX - 10 + Math.random() * 20, B - 1, 'smoke');
      } else if (st.fw !== undefined) { const u = st.fw;   // kommt aus dem Himmel geflogen, landet auf der Wiese und jubelt beim Feuerwerk
        if (u < 2.5) hop(Math.max(0, u) / 2.5, 330, -10, GX, GB, -6); else { mx = GX; mb = GB; stand = true; const up = Math.floor(u * 1.4) % 2; pose.rL = up ? 2 : 1; pose.rR = up ? 1 : 2; }
        SFX.edge('fwLand', u > 2.5, 'mthud', { pan: SFX.panX(GX) }); SFX.edge('fwCheer', u > 3, 'cheer'); }
      else {   // Wache: Tor geht auf, er stapft langsam heraus, die Treppe hinunter, Düsensprung auf die Wiese; nachts Streife mit Scheinwerfer, tagsüber Vögel und Gruß; zurück, Tor geht zu
        const u = ART.mechaU(time), E = ART.MEXT, STB2 = 330, cyc = Math.floor((time + 60) / (150 + E));
        if (YM.cyc !== cyc && u >= 11.5) { YM.cyc = cyc; YM.night = n > .45; }   /* Programm wird beim Landen gewählt und bleibt bis zum Ende gleich */
        if (u >= 2 && u < 10) { walkSeg(u - 2, DOOR, STB2); if (u - 2 > 6.6) side = -1; }
        else if (u >= 10 && u < 11.5) hop((u - 10) / 1.5, STB2, hw(STB2), GX, GB, 22);   // springt oben von der Treppe mit Düsen auf die Wiese
        else if (u >= 11.5 && u < 86) {
          const v = u - 11.5, night = YM.cyc === cyc ? YM.night : n > .45; mb = GB;
          if (night) {   /* Streife: geht die Wiese ab, bleibt stehen und sucht mit dem Licht */
            if (Math.random() < dt * .18) SFX.play('mbeep', { pan: SFX.panX(mx || GX), vol: .55, gap: 4 });   /* piept ab und zu beim Absuchen */
            const sweep = (cx, w, sp) => ({ tx: cx + Math.sin(time * sp) * w, ty: G + 29 + Math.cos(time * sp * .7) * 3 });   /* über die Wiese vorn, nicht über die Gebäude */
            if (v < 13.2) { walkSeg(v, GX, 178, GB); beam = { tx: mx - 34, ty: GB + 9 + Math.round(Math.sin(time * 1.3) * 3) }; }
            else if (v < 19.2) { mx = 178; stand = true; beam = sweep(194, 28, .8); pose.head = beam.tx < mx ? -1 : 1; SFX.edge('ymSw1', v > 13.4, 'mscan', { pan: SFX.panX(mx), vol: .8 }); }
            else if (v < 32.4) { walkSeg(v - 19.2, 178, GX, GB); beam = { tx: mx + 34, ty: GB + 9 + Math.round(Math.sin(time * 1.3) * 3) }; }
            else if (v < 38.4) { mx = GX; stand = true; beam = sweep(214, 24, .9); pose.head = beam.tx < mx ? -1 : 1; SFX.edge('ymSw2', v > 32.6, 'mscan', { pan: SFX.panX(mx), vol: .8 }); }
                        else { mx = GX; stand = true; beam = { tx: 200 + Math.sin(time * .35) * 26, ty: G + 30 }; pose.head = beam.tx < GX - 10 ? -1 : 0; }
          } else {   /* Tagschicht: grüßt, stapft nach links, hält den Arm hin, Vögel landen darauf, er pustet sie mit Dampf fort, streckt sich */
            if (v < 4) { mx = GX; stand = true; pose.rR = 2 - Math.floor(time * 2.5) % 2; SFX.edge('ymWave', v > .2, 'mservo', { pan: SFX.panX(GX), vol: .5 }); }
            else if (v < 15) walkSeg(v - 4, GX, 186, GB);
            else if (v < 37) { mx = 186; stand = true; const w = v - 15; pose.rR = w < 1 ? 1 : w < 20 ? 2 : 1; pose.head = w > 2 && w < 19 ? 1 : 0; birdsOn = w; if (w > 19 && w < 20.5) pose.bob = 1;
              SFX.edge('ymBirdIn', w > 1.5, 'flap', { pan: SFX.panX(186), vol: .8 }); SFX.edge('ymPuff', w > 19, 'msteam', { pan: SFX.panX(186), vol: .6 }); SFX.edge('ymBirdOut', w > 19.3, 'flap', { pan: SFX.panX(186) });
              if (w > 6 && w < 18 && Math.random() < dt * .6) SFX.play('chirp', { pan: SFX.panX(186), vol: .7, gap: 1 }); if (w > 19 && w < 20 && Math.random() < .5) puff(186 + (Math.random() - .5) * 20, GB - 30, 'smoke'); }
            else if (v < 48) walkSeg(v - 37, 186, GX, GB);
            else if (v < 52) { mx = GX; stand = true; pose.rL = 2; pose.rR = 2; pose.bob = Math.floor(time * 2) % 2; SFX.edge('ymStretch', v > 48.2, 'mservo', { pan: SFX.panX(GX), vol: .6 }); }
            else { mx = GX; stand = true; const lp = PROMC && PROMC.find(a => a.st === 'walk' && Math.abs(a.x - GX) < 30); if (lp) { pose.head = lp.x < GX ? -1 : 1; pose.rR = 2 - Math.floor(time * 2.5) % 2; } }   /* winkt Spaziergängern zu */
          }
        }
        else if (u >= 86 && u < 87.5) hop((u - 86) / 1.5, GX, GB, STB2, hw(STB2), 22);
        else if (u >= 87.5 && u < 95.5) { if (u < 88.9) { mx = STB2; mb = hw(STB2); side = 1; pose.step = 0; } else walkSeg(u - 88.9, STB2, DOOR); }
        const gq = u < 2 ? u / 2 : u < 4 ? 1 : u < 6 ? 1 - (u - 4) / 2 : u >= 93.5 && u < 95.5 ? (u - 93.5) / 2 : u >= 95.5 && u < 97.5 ? 1 : u >= 97.5 && u < 99.5 ? 1 - (u - 97.5) / 2 : 0;
        const kw = HIT.kraftwerk; if (gq > 0 && kw) { const gx = kw.x + 1 + 17, gb = kw.y + 1 + 59, hh = Math.round(27 * ease(gq)); R(lc, gx, gb - hh, 28, hh + 1, '#1d1826'); R(lc, gx, gb - hh - 1, 28, 1, '#565b66'); R(lc, gx + 2, gb - 3, 24, 2, '#2a2433'); }   /* Rolltor offen: dunkle Halle */
        SFX.edge('ymGate1', u < 2, 'servo', { pan: SFX.panX(DOOR), vol: .6 }); SFX.edge('ymGate2', u >= 93.5 && u < 95.5, 'servo', { pan: SFX.panX(DOOR), vol: .6 });
        SFX.edge('ymHop1', u > 10 && u < 11.5, 'mjet', { pan: SFX.panX(STB2), vol: .7 }); SFX.edge('ymLand1', u > 11.5 && u < 86, 'mthud', { pan: SFX.panX(GX), vol: .5 });
        SFX.edge('ymHop2', u > 86 && u < 87.5, 'mjet', { pan: SFX.panX(GX), vol: .7 }); SFX.edge('ymLand2', u > 87.5 && u < 99.5, 'mthud', { pan: SFX.panX(STB2), vol: .5 });
      }
      if (mx !== null) {
        if (stand) { const ph = time * 3; if (!pose.bob) pose.bob = Math.sin(ph) > .3 ? 1 : 0; const lk = Math.sin(time * .45); pose.head = lk > .55 ? -1 : lk < -.7 ? 1 : 0; if (!pose.rL && !pose.rR && (time % 11) > 9.8) pose.rR = 1; }
        let lift = 0; if (A) { const t2 = A.t, up = Math.floor(t2 * 2.5) % 2;
          if (A.k === 'abheben') { lift = Math.round(Math.sin(Math.min(1, t2 / 3) * Math.PI) * 8); jet = jet || t2 < 2.9; }
          else if (A.k === 'winken') pose.rR = 2 - up; else if (A.k === 'faust') { pose.rL = up * 2; pose.rR = (1 - up) * 2; } else pose.head = Math.sin(t2 * 4) > 0 ? -1 : 1;
          SFX.once('ya' + A.id, A.k === 'abheben' ? 'mjet' : A.k === 'dampf' ? 'msteam' : 'mservo', { pan: SFX.panX(mx), vol: .6 }); if (A.k === 'dampf' && Math.random() < .4) puff(mx + (Math.random() - .5) * 20, mb - 34, 'smoke'); }
        const S2 = side && !jet ? SPR.mechaSideFrame({ step: pose.step }, M.paint) : SPR.mechaYardFrame(pose, M.paint), X0 = Math.round(mx), B0 = Math.round(mb) - lift, FL = side > 0;
        if (jet) SFX.hum('jet', .3, SFX.panX(mx)); SFX.hum('reactor', .08, SFX.panX(mx));
        add(dep !== null ? dep : Math.round(mb), () => { ART.OCC.on = true; const o = blit(lc, S2, X0, B0, null, FL); ART.OCC.on = false; HIT.ymecha = { x: o.x, y: o.y, w: S2.w, h: S2.h, ymecha: 1 };
          const pulse = .6 + .4 * Math.sin(time * 3), hidden = (x, y) => ['blechwerkstatt', 'prueflabor'].some(id => { const h = HIT[id]; return h && x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h; });   /* Gebäude vorn verdecken sein Leuchten */
          S2.fire.forEach(f => hidden(o.x + f.x, o.y + f.y) || L.push({ x: FL ? o.x + S2.w + 2 - f.x - f.w : o.x + f.x - 1, y: o.y + f.y - 1, w: f.w, h: f.h, c: f.h > 1 ? '#ff7a2c' : '#ffd56a', fire: true, a: pulse }));
          if (jet) for (const fx2 of [o.x + 10, o.x + 20]) { const fy2 = o.y + S2.h + 1, fl = 2 + Math.floor(Math.random() * 3); R(lc, fx2, fy2, 5, fl, '#ff7a2c'); R(lc, fx2 + 1, fy2, 3, fl - 1, '#ffd56a'); if (!hidden(fx2 + 2, fy2)) L.push({ x: fx2, y: fy2, w: 5, h: fl, c: '#ff9a3c', fire: true }); if (Math.random() < .4) { puff(fx2 + 3, fy2 + 3, 'smoke'); if (dep !== null) parts[parts.length - 1].z = dep; } }   /* Düsen unter den Stiefeln; der Rauch merkt sich die Tiefe des Mechas */
          if (beam && n > .3 && !jet) { const ex = side && !jet ? (FL ? o.x + S2.w - 8 : o.x + 9) : o.x + 1 + 16 + pose.head, ey = side && !jet ? o.y + 8 : o.y + 1 + 8 + pose.bob; SL = { x: ex, y: ey, tx: beam.tx, ty: beam.ty, a: Math.min(1, (n - .3) / .2) }; }   /* Gebäude vorn verdecken den Kegel */
          if (birdsOn !== null) { const w = birdsOn, hx = o.x + 1 + 27, hy = o.y + 1 + 10 + pose.bob - 2, hd = o.x + 1 + 16 + pose.head, hdy = o.y + 1 + pose.bob;   /* zwei Vögel landen auf der Faust, einer auf dem Kopf */
            [[hx - 1, hy, 1.5, -1], [hx + 2, hy, 2.4, 1], [hd, hdy, 3.4, -1]].forEach(([bx, by, t0, f], j) => { const tin = w - t0, tout = w - 19.3 - j * .2;
              if (tin < 0) return; if (tout > 0) { if (tout < 3) bird(lc, Math.round(bx + f * -50 * tout * tout / 3), Math.round(by - 26 * tout), Math.floor(time * 10) % 2 === 0, false, f); return; }
              if (tin < 2) { const q = tin / 2, e = 1 - (1 - q) * (1 - q); bird(lc, Math.round(bx + f * 46 * (1 - e)), Math.round(by - 24 * (1 - e)), Math.floor(time * 10) % 2 === 0, false, f); return; }
              const hop2 = Math.floor((tin + j) * .7) % 5 === 0, pk = Math.floor((tin + j * 1.3) * 2.5) % 6 === 0; bird(lc, bx, by - (hop2 ? 1 : 0), null, pk, (Math.floor(tin / 3 + j) % 2) ? f : -f); }); } });
      }
    }
    if (st.trophy) add(G - 2, () => debris(lc, 372, G - 2));   // Trophäe: Katapult-Trümmer am Hang vor dem Kraftwerk
    add(H + 1, () => fxStep(lc, dt));
    if (VG.t !== undefined) { VG.t += dt; const q = VG.t / 2.6; if (q >= 1) delete VG.t; else { const out = q < .5 ? q * 2 : (1 - q) * 2, bx = VG.x + Math.sin(q * Math.PI * 2) * 18 * out, by = VG.y - 4 - out * 16;   /* Vogel fliegt eine Runde und kommt zurück */
      add(H + 2, () => bird(lc, Math.round(bx), Math.round(by), Math.floor(time * 10) % 2 === 0, false, Math.cos(q * Math.PI * 2) > 0 ? -1 : 1)); } }
    delete HIT.owl; { const want = n > .6 ? 1 : 0; if (OW.p !== want) { if (OW.p === 0 || OW.p === 1) SFX.play('flap', { pan: SFX.panX(141), vol: .8 }); OW.p = Math.max(0, Math.min(1, OW.p + Math.sign(want - OW.p) * dt / 10)); }   /* gemächlicher Flug, etwa 10 Sekunden */   /* Eule fliegt abends an und morgens weg */
      if (OW.p > 0) { const tr = SPR.cozyTree2, px0 = 141 + 2, py0 = G + 1 - tr.h + 7, q = OW.p, e = 1 - (1 - q) * (1 - q), r = 1 - e, ox = Math.round(px0 - r * 170 + Math.sin(r * 5.5) * 14 * r), oy = Math.round(py0 - r * 34 - Math.sin(r * Math.PI) * 10 + Math.sin(r * 14) * 3 * r), fly = q < 1, glide = Math.sin(r * 14) > .3, blink = !fly && (time % 6) < .15, fl = glide ? 1 : Math.floor(time * 5) % 2;   /* weiter Bogen mit Wellen: Flügelschläge, dazwischen Gleiten */
        R(lc, ox - 2, oy, 5, 6, '#5c3a2e'); R(lc, ox - 1, oy + 3, 3, 3, '#a5703f'); R(lc, ox, oy + 2, 1, 1, '#e8a83a');
        if (fly) { const ph = glide ? 1 : Math.floor(time * 7) % 4, dy = [-2, 0, 2, 0][ph];   /* Flügel: oben, Mitte, unten, Mitte; beim Gleiten ausgebreitet */
          for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) { const wx = sd < 0 ? ox - 3 - i : ox + 3 + i, wy = oy + 2 + Math.round(dy * (i + 1) / 5); R(lc, wx, wy, 1, i < 3 ? 2 : 1, i === 4 ? '#5c3a2e' : '#7f5236'); } }
        else { R(lc, ox - 2, oy - 1, 1, 1, '#5c3a2e'); R(lc, ox + 2, oy - 1, 1, 1, '#5c3a2e'); R(lc, ox - 1, oy + 6, 1, 1, '#e8a83a'); R(lc, ox + 1, oy + 6, 1, 1, '#e8a83a'); }
        if (!blink) { R(lc, ox - 1, oy + 1, 1, 1, '#ffd56a'); R(lc, ox + 1, oy + 1, 1, 1, '#ffd56a'); L.push({ x: ox - 1, y: oy + 1, w: 3, h: 1, c: '#ffd56a', fire: true, a: .35 }); }
        if (!fly) HIT.owl = { x: ox - 4, y: oy - 2, w: 9, h: 10, gim: 'owl' }; else delete HIT.owl;   /* antippbar, wenn sie im Baum sitzt */
        if (!fly && Math.random() < dt * .04) SFX.play('hoot', { pan: SFX.panX(ox), vol: .9, gap: 20 });   /* Eule ruft selten und leise */ } }
    // ---- Hof: feste Ausstattung ----
    [[92, G + 10], [338, G + 33]].forEach(([x, b]) =>   /* rechte Laterne am Wegknick unten (vorher stand dort oft der Mecha) */   /* knapp unterhalb des Wegs, die Arbeiter gehen dahinter vorbei */ add(b, () => { const o = blit(lc, LAMPPOST, x, b); L.push({ x: o.x + 2, y: o.y + 3, w: 3, h: 3, c: '#ffd56a', pool: { x, y: b + 2 } }); }));
    [[SPR.leafy, 380, 151], [SPR.appleTree, 40, 152], [SPR.bush, 324, 151], [SPR.bush, 120, 136]].forEach(([sp, x, b]) => add(b, () => blit(lc, sp, x, b)));
    // gekaufte Gegenstände
    SLOTS.forEach((sl, i) => {
      const it = st.placed && st.placed[i]; HIT['slot' + i] = { x: sl.x - 7, y: sl.b - 14, w: 15, h: 15, slot: i, item: it };
      if (it && DS[it]) add(sl.b, () => { const o = blit(lc, DS[it], sl.x, sl.b); if (it === 'laterne') L.push({ x: o.x + 2, y: o.y + 3, w: 3, h: 3, c: '#ffd56a', pool: { x: sl.x, y: sl.b + 1 } }); if (it === 'brunnen') { if (Math.random() < .4) puff(o.x + 9, o.y + 1, 'drop'); SFX.hum('fountain', .05, SFX.panX(sl.x));   /* leise im Hintergrund */ } if (it === 'lichter') DS[it].fire.forEach(f => L.push({ x: o.x + f.x - 1, y: o.y + f.y - 1, w: 1, h: 1, c: '#ffd56a', a: .3 + .7 * n }));
          if (it === 'kirschbaum') { if (Math.random() < dt * .7 && PETALS.length < 12) PETALS.push({ x: o.x + 3 + Math.random() * (o.s.w - 6), y: o.y + 3 + Math.random() * 12, g: sl.b - Math.random() * 3, p: Math.random() * 6, life: 0 });
            for (const q of PETALS) { if (q.y < q.g) { q.y += dt * 5; q.x += Math.sin(time * 2 + q.p) * dt * 4 + dt * 1.5; } else q.life += dt; lc.globalAlpha = Math.max(0, 1 - q.life / 3) * (1 - n * .5); R(lc, Math.round(q.x), Math.round(q.y), 1, 1, (Math.floor(time * 3 + q.p) % 2) ? '#f2a8c0' : '#fffaf0'); }
            lc.globalAlpha = 1; for (let j = PETALS.length - 1; j >= 0; j--) if (PETALS[j].life > 3) PETALS.splice(j, 1); }
          if (it === 'vogelhaus' && n < .5) { const P = 40, u = (time + i * 13) % P, dir = i % 2 ? -1 : 1, px = o.x + 3, py = o.y - 2;
            if (u < 3) { const q = u / 3, e = 1 - (1 - q) * (1 - q); bird(lc, Math.round(px - dir * 50 * (1 - e)), Math.round(py - 22 * (1 - e) + Math.sin(q * Math.PI) * -4), Math.floor(time * 10) % 2 === 0, false, -dir); }
            else if (u < 11) { const hop = Math.floor((u - 3) / 2) % 2, pk = Math.floor(u * 3) % 4 === 0; bird(lc, px + (hop ? 1 : -1), py, null, pk, Math.floor((u - 3) / 4) % 2 ? 1 : -1); }
            else if (u < 14) { const q = (u - 11) / 3; bird(lc, Math.round(px + dir * 60 * q * q), Math.round(py - 30 * q), Math.floor(time * 10) % 2 === 0, false, -dir); } } });
      else if (st.showSlots) FREE.push(sl);
    });
    MEI = null; if (st.meister) {   // Titel „Meisterbetrieb“: goldene Plakette mit Stern hängt unter dem Torbogen
      const px = POS.tor.x, py = POS.tor.b - 23; R(lc, px - 4, py - 2, 1, 2, '#4a4652'); R(lc, px + 4, py - 2, 1, 2, '#4a4652');
      R(lc, px - 6, py, 13, 7, '#7a4a1c'); R(lc, px - 5, py + 1, 11, 5, '#e8a83a'); R(lc, px - 5, py + 1, 11, 1, '#f7d86a'); R(lc, px - 5, py + 5, 11, 1, '#c07a2a');
      for (const [dx, dy] of [[0, 1], [-1, 2], [0, 2], [1, 2], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 3], [-1, 4], [1, 4]]) R(lc, px + dx, py + dy, 1, 1, '#fff3c0');
      if ((time % 5) < .4) { const gx = px - 4 + Math.round((time % 5) / .4 * 8); R(lc, gx, py + 1, 1, 4, '#ffffff'); }
      for (const sx of [px - 9, px + 9]) { R(lc, sx - 1, POS.tor.b - 2, 3, 2, '#3b3f4a'); R(lc, sx - 1, POS.tor.b - 2, 3, 1, '#6b6672'); R(lc, sx, POS.tor.b - 3, 1, 1, n > .3 ? '#fff3c0' : '#8f8a92'); if (n > .3) L.push({ x: sx, y: POS.tor.b - 3, w: 1, h: 1, c: '#fff3c0', fire: true, a: .7 }); }   /* zwei Bodenstrahler am Tor */
      MEI = { px, py }; }
    if (st.owned.statue) add(ART.RCY + 5, () => { const o = blit(lc, STATUE, ART.FORKX, ART.RCY + 5); fx('statue', o); L.push({ x: o.x + 4, y: o.y + 3, w: 7, h: 7, c: '#ffd56a', fire: true, a: .55 }); if ((time % 6) < .5) { const gx = o.x + 2 + Math.round((time % 6) / .5 * 10); R(lc, gx, o.y + 3, 1, 8, '#fff3c0'); } });   /* Glanz wandert über das Zahnrad */
    // Arbeiter auf dem Gehweg vor den Gebäuden
    add(G + 1, () => blit(lc, PBENCH, 149, G + 1));   // Bank rechts unter dem Blätterdach
    const spots = [{ x: 46, act: 'pick', face: -1 }, { x: 149, act: 'sit', face: 1 }]; let nW = 0;
    order.forEach(id => { if (id === 'tor' || st.b[id] !== 'ok' || id === 'kraftwerk') return; const p = POS[id], hw = p.front ? BUILD[id].ok.w / 2 + 4 : 0;
      if (p.front) spots.push({ x: p.x - hw, act: 'idle', face: 1 }, { x: p.x + hw, act: 'drop', face: -1 }); else spots.push({ x: p.x - 6, act: 'idle', face: 1 }, { x: p.x + 4, act: 'drop', face: -1 }); nW += Math.min(2, st.running[id] || 0); });
    const nightOnly = (c, keep) => { const c0 = keep(c); c0.spots = c.spots; c0.x0 = c.x0; c0.x1 = c.x1; c.forEach((a, i) => { if (c0.indexOf(a) >= 0) return; const out = -14 - i * 8; if (!isFinite(a.x)) a.x = out; if (!isFinite(a.dist)) a.dist = 0; if (a.x > out) { const sp = 4.2 * (dt || 0);   /* dt kann im ersten Bild fehlen */ a.x = Math.max(out, a.x - sp); a.dist += sp; a.dir = -1; a.st = 'walk'; a.box = false; } else { a.st = 'act'; a.act = 'idle'; a.face = 1; } a.t = 1.5 + i * 2.5; a.tt = a.t; }); return c0; };   /* Feierabend: die anderen gehen nach links hinaus; morgens kommen sie herein */   /* nachts sind die anderen weg (links vor dem Tor); morgens kommen sie herein */
    if (spots.length > 1) { const nt = nightW && st.fw === undefined, sp2 = nt ? spots.map(sp => ({ x: sp.x, act: 'idle', face: sp.face })) : lunch ? spots.map(sp => ({ x: sp.x, act: sp.act === 'sit' ? 'sit' : 'coffee', face: sp.face })) : spots;   /* Mittagspause: Kaffee und Bank; nachts nur der Nachtwächter */
      const c = WORKERS.crew('hof', Math.min(5, Math.max(1, nW)), sp2, 'small', 36, 286), cw = nt ? nightOnly(c, c => [c[0]]) : c;
      if (st.fw !== undefined) watch(c); else WORKERS.step(cw, dt);
      add(G + 5, () => { WORKERS.draw(lc, cw, G + 4, time); if (nt) { const a = c[0], fc = (a.st === 'walk' ? a.dir : a.face) || 1, lx = Math.round(a.x) + (fc > 0 ? 3 : -3), ly = G - 1 + (a.st === 'walk' && Math.floor(a.dist / 3) % 2 ? 1 : 0);   /* Laterne in der Hand */
        R(lc, lx, ly - 1, 1, 1, '#3e2731'); R(lc, lx, ly, 1, 2, '#ffd56a'); L.push({ x: lx, y: ly, w: 1, h: 2, c: '#ffd56a', fire: true, pool: { x: lx, y: G + 5 } }); if (a.st === 'walk' && Math.random() < dt * .12) SFX.play('lantern', { pan: SFX.panX(lx), vol: .6, gap: 5 }); } }); }
    // Spaziergänger unten auf der Uferpromenade: bleiben stehen, schauen aufs Wasser, gehen weiter
    PROMC = null; ANG = null; if (spots.length > 1) { const ps = [{ x: 44, act: 'pier', face: 1 }, { x: 110, act: 'idle', face: 1 }, { x: 186, act: 'idle', face: -1 }, { x: 262, act: 'idle', face: 1 }, { x: 342, act: 'pond', face: -1 }];
      const c2 = WORKERS.crew('prom', Math.max(1, Math.min(2, Math.ceil(nW / 2))), ps, 'small', 28, 372), ntP = nightW && st.fw === undefined;
      if (ntP) { const a0 = c2[0]; nightOnly(c2, c => [c[0]]);   /* abends geht der erste zum Steg, hinaus ans Ende und setzt sich als Angler */
        if (a0.act === 'pier' && a0.st === 'act') { a0.tt = a0.tt || 26; if (a0.t <= a0.tt * .5) { a0.t = a0.tt * .5; ANG = a0; } else a0.t -= dt; }
        else if (a0.st === 'walk' && a0.spot === 0) { if (!isFinite(a0.x)) a0.x = 44; if (!isFinite(a0.dist)) a0.dist = 0; const d = 44 - a0.x, sp = Math.sign(d) * Math.min(Math.abs(d), 4.2 * (dt || 0)); a0.x += sp; a0.dist += Math.abs(sp); a0.dir = Math.sign(d) || a0.dir; if (Math.abs(44 - a0.x) < .2) { a0.st = 'act'; a0.act = 'pier'; a0.tt = 26; a0.t = 26; } }
        else { a0.spot = 0; a0.st = 'walk'; a0.tx = 44; } }   /* nachts: der erste sitzt als Angler am Stegende, morgens steht er auf und geht zurück */
      if (st.fw !== undefined) watch(c2); else if (!ntP) WORKERS.step(c2, dt); PROMC = c2; add(ART.PROM + 5, () => WORKERS.draw(lc, c2, ART.PROM + 4, time));
      for (const a of c2) if (a.act === 'pond' && a.st === 'act') {
        const q = 1 - a.t / (a.tt || 1), up = q < .38, down = q > .62, yTop = ART.POND.y + 2, f = up ? q / .38 : down ? (1 - q) / .38 : 1, y = Math.round(ART.PROM + 4 - f * (ART.PROM + 4 - yTop)), x = Math.round(ART.gardenX(y));
        add(y, () => { if (up || down) { const F = WORKERS.front(a.v, up); ART.blit(lc, F[Math.floor((ART.PROM - y) / 2) % 4], x, y + 1, null, false); } else { const W2 = WORKERS.set('small', a.v), S2 = W2.S; ART.blit(lc, (q > .45 && q < .55 ? W2.wave : W2.idle)[Math.floor(time * 1.5) % 2], x + 3, y + Math.round(S2.h - S2.hipY - S2.thigh - S2.shin), null, false); } }); } }
    // Gabelstapler auf dem Fahrweg, Katzenroboter auf dem Grünstreifen
    if (st.owned.stapler) { const ph = time * .05, tgt = work ? 205 + Math.sin(ph) * 95 : 318;   /* nachts weiter rechts am Weg abgestellt, gut sichtbar */ if (FK.x === undefined) FK.x = tgt; const dx = tgt - FK.x, mv = Math.max(-dt * 6, Math.min(dt * 6, dx)); FK.x += mv; if (Math.abs(mv) > .001) FK.dir = Math.sign(mv); const x = FK.x, moving = Math.abs(mv) > .001;   /* fährt abends zum Parkplatz und morgens wieder los */
      if (moving) SFX.hum('forklift', .18, SFX.panX(x)); SFX.edge('forkBeep', moving && FK.dir < 0 && Math.floor(time * 1.4) % 2 === 0, 'beep', { pan: SFX.panX(x), vol: .7 });   /* rückwärts piept er */ add(G + 4, () => fx('stapler', blit(lc, !work && !moving ? FORK_E : FORK, x, G + 4, null, (FK.dir || 1) < 0))); }   /* abgestellt: Fahrer hat Feierabend, Gabel leer */
    if (st.owned.katze) { const c = ART.catStep(CATST, dt, time, 50, 290, 6, .55); if (Math.random() < dt * .02) SFX.play('meow', { pan: SFX.panX(c.x), vol: .7, gap: 20 }); add(VERGE_B + 1, () => { const o = blit(lc, c.fr, c.x, VERGE_B + 1, null, c.flip); fx('katze', o); L.push({ x: o.x + (c.flip ? c.fr.w - 1 - c.fr.eye.x : c.fr.eye.x), y: o.y + c.fr.eye.y, w: 1, h: 1, c: '#7fe0ff', fire: true, a: .6 }); }); }
    // Lieferwagen: fährt durch das Tor herein und parkt auf dem Fahrweg
    delete HIT.truck;
    // Lieferwagen fährt auf dem Weg herein und biegt in die Haltebucht
    if (st.truck) {
      // Ablauf: kommt auf dem Weg herein und zieht in einem sanften Bogen in die Haltebucht (wie beim Ranfahren an den Rand).
      // Der Wagen bleibt in Seitenansicht (ohne Verzerrung), Staub wirbelt auf.
      const t = time - (st.truckT || 0) - 6, XT = 70, D = 3.4, top = G + 6, bot = ART.BAY[2] - 1, run = 18 * D / 2;
      let tx = XT, tb = bot, sk = 0;
      if (t < -D) { tx = XT - run + (t + D) * 18; tb = top; }
      else if (t < 0) { const u = (t + D) / D; tx = XT - run * (1 - u) * (1 - u); tb = top + (bot - top) * u * u * (3 - 2 * u); /* keine Scherung mehr: Wagen bleibt in Seitenansicht und fährt schräg in die Bucht */ }
      const sp = TRUCK, light = [36, 9]; if (t > -9 && t < 0) SFX.hum('engine', .3 * Math.min(1, (t + 9) / 3), SFX.panX(tx)); SFX.edge('truckStop', t >= 0, 'hiss', { pan: SFX.panX(tx), vol: .6 });   /* Motor, beim Halten zischt die Bremse */
      add(tb, () => { const x0 = Math.round(tx) - Math.floor(sp.w / 2) - 1, y0 = Math.round(tb) - sp.h - 1, cw = sp.c.width;
        if (sk) { lc.save(); lc.translate(x0, y0); lc.transform(1, sk, 0, 1, 0, -sk * cw / 2); lc.drawImage(sp.c, 0, 0); lc.restore(); } else lc.drawImage(sp.c, x0, y0);
        HIT.truck = { x: x0 + 1, y: y0 + 1, w: sp.w, h: sp.h }; L.push({ x: x0 + 1 + light[0], y: Math.round(y0 + 1 + light[1] + sk * (light[0] + 1 - cw / 2)), w: 1, h: 2, c: '#fff3c0', fire: true, a: .5 }); });
    }
    add(WATER - 1, () => reeds(lc, time, k));
    D.sort((a, b) => a.y - b.y).forEach(d => d.f());
    tint(lc, W, H, k.tint);
    sc.drawImage(layer, 0, 0);
    // Lichtpfützen der Laternen auf dem Pflaster
    /* Lichtpfützen der Laternen: jetzt im Lichtschein-Durchgang, damit Mecha und Figuren davor sie verdecken */
    stepParts(dt);
    const smc = rgb(mix(hx('#d6d6de'), k.bot, .35));
    let behind = false; PG.clearRect(0, 0, W, H);
    for (const p of parts) { const a = Math.max(0, p.life / p.max), g3 = p.z !== undefined && p.z < ART.PROM + 1 ? (behind = true, PG) : sc; g3.globalAlpha = p.kind === 'smoke' ? a * .55 : .9; R(g3, p.x, p.y, p.sz, p.sz, p.kind === 'smoke' ? smc : p.c); }
    sc.globalAlpha = 1; PG.globalAlpha = 1;
    if (behind) { PG.globalCompositeOperation = 'destination-out'; for (const f of FRONTS) PG.drawImage(f.c, f.x, f.y); PG.globalCompositeOperation = 'source-over'; sc.drawImage(PC, 0, 0); }   /* Rauch hinter dem Prüflabor bleibt hinter dem Prüflabor */
    const pools = g2 => { if (n > .2) for (const l of L) if (l.pool) { const a = (n - .2) * .45; for (let i = 0; i < 4; i++) { g2.globalAlpha = a * (.18 + i * .1); const w = 26 - i * 6; R(g2, l.pool.x - w / 2, l.pool.y - 1 - Math.floor(i / 2), w, 3 - Math.floor(i / 2), '#ffd98a'); } g2.globalAlpha = 1; } };
    ART.glowPass(sc, L, l => (l.fire ? Math.max(n, .35) : n) * (l.a === undefined ? 1 : l.a), !SL ? pools : (g2 => { pools(g2);   // Suchscheinwerfer aus den Augen des Mechas: Kegel und heller Fleck am Boden; Gebäude vorn verdecken ihn
      CG.clearRect(0, 0, W, H); const gr = CG.createLinearGradient(SL.x, SL.y, SL.tx, SL.ty); gr.addColorStop(0, 'rgba(255,240,190,.4)'); gr.addColorStop(1, 'rgba(255,240,190,.08)');
      CG.fillStyle = gr; CG.beginPath(); CG.moveTo(SL.x, SL.y); CG.lineTo(SL.tx - 16, SL.ty); CG.lineTo(SL.tx + 16, SL.ty); CG.closePath(); CG.fill();
      CG.fillStyle = 'rgba(255,240,190,.2)'; CG.beginPath(); CG.ellipse(SL.tx, SL.ty, 17, 4, 0, 0, Math.PI * 2); CG.fill();
      CG.globalCompositeOperation = 'destination-out'; for (const f of FRONTS) CG.drawImage(f.c, f.x, f.y); CG.globalCompositeOperation = 'source-over'; g2.globalAlpha = SL.a === undefined ? 1 : SL.a; g2.drawImage(CONE, 0, 0); g2.globalAlpha = 1; })); ART.OCC.list.length = 0;
    if (MEI && n > .3) { const { px, py } = MEI, b0 = POS.tor.b - 3, a = Math.min(1, (n - .3) / .25);   /* Strahler beleuchten die Plakette von unten: zwei weiche Lichtkegel und ein heller Schein auf der Unterkante */
      sc.save(); sc.globalCompositeOperation = 'lighter';
      for (const sx of [px - 9, px + 9]) { const gr = sc.createLinearGradient(sx, b0, px, py); gr.addColorStop(0, `rgba(255,236,180,${.34 * a})`); gr.addColorStop(1, `rgba(255,236,180,${.05 * a})`); sc.fillStyle = gr; sc.beginPath(); sc.moveTo(sx, b0); sc.lineTo(px - 6, py - 1); sc.lineTo(px + 6, py + 7); sc.closePath(); sc.fill(); }
      sc.globalAlpha = .35 * a; R(sc, px - 5, py + 3, 11, 3, '#7a5a20'); sc.globalAlpha = .18 * a; R(sc, px - 5, py + 1, 11, 2, '#7a5a20'); sc.restore(); }
    if (st.fw !== undefined) {   // Feuerwerk über dem See
      const u = st.fw, COLS = [['#ff5a4a', '#ffd56a'], ['#7fd4ff', '#ffffff'], ['#9cff7a', '#fff3c0'], ['#d07aff', '#ffb0e0'], ['#ffb04a', '#fff3c0']];
      sc.save(); sc.globalCompositeOperation = n > .4 ? 'lighter' : 'source-over';   /* am Tag deckend, damit die Farben vor dem hellen Himmel leuchten */
      for (let i = 0; i < 26; i++) { const ti = i < 20 ? 3.5 + i * .5 : 13.6 + (i - 20) * .09, a = u - ti, x0 = 40 + (i * 97) % 300,   /* 20 Raketen, dann das große Finale */ ax = x0 + ((i * 13) % 20) - 10, ay = 22 + (i * 37) % 40, cs = COLS[i % COLS.length];
        SFX.edge('fwL' + i, a >= 0 && a < 1, 'fwPfiff', { pan: SFX.panX(x0), vol: .7 }); SFX.edge('fwB' + i, a >= 1 && a < 3, 'fwKnall', { pan: SFX.panX(ax), vol: .55 });
        if (a < 0) continue;
        if (a < 1) { const q = 1 - (1 - a) * (1 - a), rx = lerp(x0, ax, q), ry = lerp(ART.PROM, ay, q); for (let j = 0; j < 6; j++) { sc.globalAlpha = (1 - j / 6) * .7; R(sc, Math.round(lerp(x0, ax, Math.max(0, q - j * .03))), Math.round(lerp(ART.PROM, ay, Math.max(0, q - j * .03))), 1, 1, '#ffe8b0'); } sc.globalAlpha = 1; R(sc, Math.round(rx), Math.round(ry), 1, 1, '#ffffff'); }
        else if (a < 3) { const b2 = a - 1, fade2 = Math.max(0, 1 - b2 / 2);
          if (n < .4 && b2 > .4) { sc.globalAlpha = fade2 * .25; for (let j = 0; j < 8; j++) { const an = j / 8 * Math.PI * 2 + i; R(sc, Math.round(ax + Math.cos(an) * 14 * b2) - 1, Math.round(ay + Math.sin(an) * 12 * b2 + 4 * b2 * b2) - 1, 3, 3, '#e8e4ea'); } }   /* am Tag: kleine Rauchwölkchen */
          if (b2 < .3) { sc.globalAlpha = (1 - b2 / .3) * .35; for (let r2 = 10; r2 > 2; r2 -= 3) R(sc, ax - r2, ay - r2, r2 * 2 + 1, r2 * 2 + 1, cs[1]); }
          for (let j = 0; j < 40; j++) { const an = j / 40 * Math.PI * 2 + i, v = 26 + ((i * 7 + j * 5) % 12), d = v * (1 - Math.exp(-2.4 * b2)), px = ax + Math.cos(an) * d, py = ay + Math.sin(an) * d + 7 * b2 * b2, sz = b2 < .7 ? 2 : 1;
            sc.globalAlpha = fade2 * (Math.random() < .85 ? 1 : .3); R(sc, Math.round(px), Math.round(py), sz, sz, j % 3 ? cs[0] : cs[1]); if (b2 > .3) { sc.globalAlpha = fade2 * .4; R(sc, Math.round(px - Math.cos(an) * 2), Math.round(py - Math.sin(an) * 2 - 1), 1, 1, cs[0]); } } } }
      sc.restore(); }
    if (n > .4) { const ff = (n - .4) / .6; for (const f of flies) { const x = ((f.x + Math.sin(time * f.s + f.p) * 10) % W + W) % W, y = Math.min(hillH[Math.floor(x)], ART.VERGE + 4) - 5 - Math.abs(Math.sin(time * .5 * f.s + f.p * 1.3)) * 16, bl = Math.sin(time * 2.2 * f.s + f.p * 4); if (bl > .1) glow(sc, { x, y: f.p > 3.5 ? y + 34 : y, w: 1, h: 1, c: '#eaff9c' }, ff * bl); } }
    ctx.drawImage(scene, 0, 0, W, WATER, 0, 0, W, WATER);
    water(ctx, scene, k, time, sunPos, moonPos);
    lilies(ctx, time, k);
    {   // Morgennebel über dem See
      const mq = t > .15 && t < .34 ? Math.sin((t - .15) / .19 * Math.PI) : 0;
      if (mq > .02) for (let i = 0; i < 5; i++) { const yy = WATER + 3 + i * 6, off = (time * (2 + i) + i * 70) % (W + 120) - 60; ctx.globalAlpha = mq * (.32 - i * .04); R(ctx, Math.round(off) - 60, yy, 140, 3, '#f4f6fb'); R(ctx, Math.round(off + 180) % (W + 120) - 60, yy + 2, 110, 2, '#f4f6fb'); } ctx.globalAlpha = 1; }
    {   // Entenfamilie: schwimmt am Tag dicht am Ufer entlang, dreht manchmal eine Runde am Steg und schwimmt rechts ganz aus dem Bild
      const P = 120, cyD = Math.floor(time / P), u = time % P, loop = cyD % 2 === 0, LA = 86, LO = loop ? 47 : 0, LEN = LA + LO + (W + 40 - 66), SP = 7;
      if (DK.cyc !== cyD) { DK.cyc = cyD; DK.day = n < .4; }
      const at = d => { if (d < LA) return { x: -20 + d, y: WATER + 5, f: 1 }; if (d < LA + LO) { const a = (d - LA) / LO * Math.PI * 2; return { x: 66 + 10 * Math.sin(a), y: WATER + 10 - 5 * Math.cos(a), f: Math.cos(a) >= 0 ? 1 : -1 }; } const d2 = d - LA - LO; return { x: 66 + d2, y: WATER + 5 + Math.round(Math.sin(d2 * .05)), f: 1 }; };
      if (DK.boost > 0) { DK.boost -= dt; DK.extra = (DK.extra || 0) + dt * SP * 1.6; } if (DK.cyc2 !== cyD) { DK.cyc2 = cyD; DK.extra = 0; }   /* angetippt: kurz schneller */
      const d0 = u * SP + (DK.extra || 0); delete HIT.ducks; if (DK.day && d0 < LEN + 30) { const mq = at(Math.min(d0, LEN)); if (mq.x > -6 && mq.x < W + 6) HIT.ducks = { x: Math.round(mq.x) - 22, y: Math.round(mq.y) - 6, w: 30, h: 10, gim: 'ducks' };
        const m = at(Math.min(d0, LEN)); if (m.x > -6 && m.x < W + 6 && Math.random() < dt * .08) SFX.play('quack', { pan: SFX.panX(m.x), vol: .7, gap: 9 });
        for (let i = 3; i >= 0; i--) { const d = d0 - (i ? 6 + i * 5 : 0); if (d < 0 || d > LEN) continue; const q = at(d), dx = Math.round(q.x), y = Math.round(q.y), f = q.f, b = Math.sin(time * 3 + i) > .6 ? 1 : 0, big = i === 0;
          const P2 = (x, yy, w, h, c) => R(ctx, f > 0 ? dx + x : dx - x - w + 1, yy, w, h, c);   /* spiegelt beim Wenden */
          ctx.globalAlpha = .25; P2(-1, y + 2, big ? 6 : 4, 1, '#0b1030'); ctx.globalAlpha = 1;
          if (big) { P2(-1, y - b, 5, 2, '#8a6a4a'); P2(2, y - 2 - b, 2, 2, '#2f6a3a'); P2(4, y - 1 - b, 1, 1, '#e8a83a'); P2(-1, y - b, 2, 1, '#6a4e36'); }
          else { P2(0, y - b, 3, 2, '#f2d86a'); P2(2, y - 1 - b, 1, 1, '#f2d86a'); P2(3, y - b, 1, 1, '#e8a83a'); }
          if (Math.floor(time * 2 + i) % 3 === 0) { ctx.globalAlpha = .3; P2(-3, y + 1, 2, 1, '#e8f6ff'); ctx.globalAlpha = 1; } } } }
    if (ANG) {   // nachts: Angler sitzt am Stegende, Laterne neben sich, Schwimmer zuckt ab und zu
      const ax = PX + 1, ay = WATER + 7, sp = WORKERS.frontSit(ANG ? ANG.v : 3)[0], u = time % 23, bite = u > 17 && u < 18.4, bx = PX + 15, by = WATER + 19 + (bite && Math.floor(u * 6) % 2 ? 1 : 0);
      ctx.save(); ctx.filter = 'brightness(' + Math.round((1 - n * .45) * 100) + '%)'; ART.blit(ctx, sp, ax, ay, null, false); ctx.restore();
      ctx.globalAlpha = .8; for (let i = 0; i <= 8; i++) R(ctx, ax + 3 + i, ay - 9 - Math.round(i * .6), 1, 1, '#7f5236'); ctx.globalAlpha = .35; for (let yy = ay - 14; yy < by; yy += 2) R(ctx, Math.round(ax + 11 + (bx - ax - 11) * (yy - ay + 14) / (by - ay + 14)), yy, 1, 1, '#d8d2cc'); ctx.globalAlpha = 1;
      R(ctx, bx, by, 1, 1, '#ff5a4a'); R(ctx, bx, by + 1, 1, 1, '#f4ecdc'); if (bite) { ctx.globalAlpha = .5; R(ctx, bx - 2, by + 2, 5, 1, '#e8f6ff'); ctx.globalAlpha = 1; } SFX.edge('bite', bite, 'plop', { pan: SFX.panX(bx), vol: .7 });
      R(ctx, PX - 4, ay - 3, 2, 3, '#ffd56a'); R(ctx, PX - 4, ay - 4, 2, 1, '#3e2731'); glow(ctx, { x: PX - 4, y: ay - 3, w: 2, h: 3, c: '#ffd56a' }, n); }
    {   // nachts: Ruderboot mit Laterne zieht langsam vorbei (beim Start der Runde entschieden, fährt immer ganz aus dem Bild)
      const P = 150, u = (time + 40) % P, cyR = Math.floor((time + 40) / P); if (RB.cyc !== cyR) { RB.cyc = cyR; RB.night = n > .55; } if (RB.night && u < 110) { const x = Math.round(W + 20 - u * (W + 40) / 110), y = WATER + 25, st4 = Math.floor(u / 2.2) % 2;
        ctx.globalAlpha = .25; R(ctx, x - 8, y + 1, 18, 2, '#0b1030'); ctx.globalAlpha = 1;
        tinted(ctx, BOAT, x - 8, y - 5, n * .45); R(ctx, x, y - 8, 2, 3, '#2a2440'); R(ctx, x, y - 9, 2, 1, '#5c3a2e');
        R(ctx, x - 3 + st4 * 2, y - 4, 1, 1, '#7f5236'); R(ctx, x + 4 - st4 * 2, y - 4, 1, 1, '#7f5236');
        if (st4) { ctx.globalAlpha = .5; R(ctx, x - 6, y - 1, 2, 1, '#e8f6ff'); R(ctx, x + 8, y - 1, 2, 1, '#e8f6ff'); ctx.globalAlpha = 1; }
        SFX.edge('oar', st4 === 1, 'oar', { pan: SFX.panX(x), vol: .5 });
        R(ctx, x + 6, y - 7, 1, 2, '#ffd56a'); glow(ctx, { x: x + 6, y: y - 7, w: 1, h: 2, c: '#ffd56a' }, n * .9); ctx.globalAlpha = n * .35; R(ctx, x + 5, y + 2, 3, 1, '#ffd56a'); R(ctx, x + 6, y + 4, 1, 1, '#ffd56a'); ctx.globalAlpha = 1; } }
    // Steg und Ruderboot vorne im Wasser
    const PX = 44;   // Steg: kurz, gerade ins Wasser
    ctx.globalAlpha = .22; R(ctx, PX - 5, WATER + 2, 12, 14, '#0b1030'); ctx.globalAlpha = 1;
    tinted(ctx, PIER, PX - 6, WATER - 3, n * .5);
    if (PROMC) for (const a of PROMC) if (a.act === 'pier' && a.st === 'act' && a !== ANG) {   // geht von vorn gesehen auf den Steg, schaut aufs Wasser, geht von hinten gesehen zurück
      const q = 1 - a.t / (a.tt || 1), out = q < .3, back = q > .7, dep = out ? q / .3 : back ? (1 - q) / .3 : 1, by = ART.PROM + 4 + Math.round(dep * (WATER + 7 - ART.PROM - 4));
      const F = WORKERS.front(a.v, back), fr = (out || back) ? F[Math.floor(Math.abs(by - ART.PROM) / 2) % 4] : F[4];
      ctx.save(); if (n > .01) ctx.filter = 'brightness(' + Math.round((1 - n * .5) * 100) + '%)'; ART.blit(ctx, fr, PX, by + 1, null, false); ctx.restore(); }
    {   // Raddampfer: kommt selten, legt kurz am unteren Ende des Stegs an (ohne zu wenden) und fährt mit der Strömung weiter
      const P = 150; let t2 = time % P; const stopX = PX + 13, y = WATER + 27, cyS = Math.floor(time / P);   /* legt so an, dass der Rumpf das Stegende überdeckt */
      if (NB.cyS !== cyS) { NB.cyS = cyS; NB.day = n < .5; }   /* fährt nur am Tag (beim Start der Runde entschieden) */
      let x = null, moving = true; if (!NB.day) t2 = 999;
      if (t2 < 45) { const q = t2 / 45; x = -50 + (stopX + 50) * (1 - (1 - q) * (1 - q)); }
      else if (t2 < 53) { x = stopX; moving = false; }
      else if (t2 < 110) { const q = (t2 - 53) / 57; x = stopX + (W + 60 - stopX) * q * q; }
      SFX.edge('steamArr', t2 >= 45 && t2 < 53, 'horn', { pan: SFX.panX(stopX), vol: .8 }); SFX.edge('steamDep', t2 >= 53 && t2 < 60, 'hornShort', { pan: SFX.panX(stopX), vol: .6 });   /* Dampfer tutet beim Anlegen und Ablegen */
      if (x !== null) { const sx = Math.round(x) - 25, bobY = Math.sin(time * .9) > .7 ? 1 : 0; if (moving) SFX.hum('chug', .4 * Math.max(0, Math.min(1, (x + 40) / 60, (W + 40 - x) / 60)), SFX.panX(x)); SFX.edge('paddle', x > -20 && x < W + 20 && Math.floor(time * 2.4) % 2 === 0, 'oar', { pan: SFX.panX(x), vol: .8 })   /* Dampfer hörbar: Tuckern und Schaufelrad */;
        ctx.globalAlpha = .22; R(ctx, sx + 2, y + 1, 46, 2, '#0b1030');
        if (moving) { ctx.globalAlpha = .3; for (let i = 1; i < 7; i++) { R(ctx, sx - i * 3, y - 2 + Math.floor(i / 2), 2, 1, '#e8f6ff'); R(ctx, sx - i * 3, y - 2 - Math.floor(i / 2), 2, 1, '#e8f6ff'); }
          for (let i = 0; i < 5; i++) { const ph = (time * 1.5 + i * .2) % 1; ctx.globalAlpha = (1 - ph) * .7; R(ctx, sx + 13 - Math.round(ph * 6), y - 3 - Math.round(Math.sin(ph * Math.PI) * 3), 1, 1, '#f4fbff'); } }   // Gischt hinter dem Radkasten
        ctx.globalAlpha = 1; tinted(ctx, STEAMER, sx, y - 26 + bobY, n * .5);
        {   // Schaufelrad: Felge und 8 Schaufeln drehen sich gleichmäßig im offenen Radkasten
          const wx = sx + 20, wy = y - 26 + bobY + 18, dk = n > .3 ? .55 : 1;
          const rot = moving ? time * 2.2 : stopAng; if (moving) stopAng = rot;
          ctx.globalAlpha = dk; for (let k2 = 0; k2 < 8; k2++) { const a = rot + k2 * Math.PI / 4, cx = Math.cos(a), cy = Math.sin(a); if (cy > .35) continue;
            for (let r = 2; r <= 5; r++) R(ctx, Math.round(wx + cx * r), Math.round(wy + cy * r), 1, 1, '#7f5236');
            R(ctx, Math.round(wx + cx * 6) - (Math.abs(cy) > .7 ? 1 : 0), Math.round(wy + cy * 6) - (Math.abs(cx) > .7 ? 1 : 0), Math.abs(cy) > .7 ? 3 : 1, Math.abs(cx) > .7 ? 3 : 1, '#3e2731'); }
          R(ctx, wx - 1, wy - 1, 2, 2, '#c07a2a'); ctx.globalAlpha = 1; }
        for (let i = 0; i < 4; i++) { const ph = ((time * .5 + i * .25) % 1); ctx.globalAlpha = (1 - ph) * .45; R(ctx, sx + 19 - ph * (moving ? 10 : 2), y - 28 - ph * 14, 3 + Math.round(ph * 3), 2 + Math.round(ph * 2), '#d6d6de'); }
        if (n > .3) { ctx.globalAlpha = n * .8; for (let xx = sx + 8; xx < sx + 39; xx += 3) if (xx < sx + 15 || xx > sx + 27) R(ctx, xx, y - 13 + bobY, 1, 1, '#ffd56a'); }
        ctx.globalAlpha = 1; }
    }
    // Hinweise: Ausrufezeichen nur bei noch nicht reparierten Gebäuden, Kiste wenn etwas abzuholen ist
    for (const id of order) {
      const h = HIT[id], m = st.marks && st.marks[id]; if (!h || !m) continue;
      const bx = h.x + Math.floor(h.w / 2), by = h.y - 4 + Math.round(Math.sin(time * 3 + h.x) * 1);
      if (m === 'crate') OVER.crate(ctx, bx, by); else if (m === 'help') OVER.bubble(ctx, bx, by, '#2f8a7e', '?'); else if (m === 'repair') OVER.bubble(ctx, bx, by, '#d0394f');
    }
    if (st.truck && HIT.truck) { const h = HIT.truck; OVER.crate(ctx, h.x + 12, h.y - 2 + Math.round(Math.sin(time * 3))); }
    if (st.showSlots) { OVER.dim(ctx, W, H); FREE.forEach((sl, i) => OVER.spot(ctx, sl.x, sl.b, 16, time, i)); }
    if (st.sel && HIT[st.sel]) { const h = HIT[st.sel], q = h.pad || 0; OVER.box(ctx, h.x - 2 - q, h.y - 2 - q, h.x + h.w + 1 + q, h.y + h.h + 1 + q, Math.sin(time * 5) > -.3 ? '#ffffff' : '#ffe08a'); }
  }
  const SLOTPOS = SLOTS;
  return { gim: (name, o) => { if (name === 'ducks') DK.boost = 1.2; if (name === 'vogel' && o) { VG.t = 0; VG.x = o.x; VG.y = o.y; } }, yard, HIT, POS, DS, SLOTS: SLOTPOS };
})();
