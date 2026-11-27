// DIE ALTE FABRIK – Pixel-Grafik (Entwurf v3)
// Alle Grafiken entstehen im Code: Text-Raster -> Canvas mit selektiver Kontur, Licht von links oben.
'use strict';
const ART = (() => {
  const W = 384, H = 200, G = 116, ROAD = 136, WATER = 164, VERGE = 143, PROM = 152, FORKX = 196, UP = G + 7, YARD_X = 0, PATH_END = 326, PROM_X = [24, W + 1], RCY = 137, BAY = [32, 104, G + 25];
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const OCC = { on: false, list: [], cover(img, x, y) { if (this.list.length) this.list.push({ img, x, y, cover: true }); } };   /* cover: später Gezeichnetes, das Personen verdeckt */   // beim Zeichnen von Personen gesammelt (siehe glowPass)
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const disc = (g, x, y, r, c) => { for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); R(g, x - w, y + dy, 2 * w + 1, 1, c); } };
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
  const mix = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- Palette (warm, leicht entsättigt; je Material 4–6 Stufen) ----------
  const PAL = {
    a: '#3e2731', b: '#5c3a2e', c: '#7f5236', d: '#a5703f', e: '#cf9a5c', f: '#ecc58c',          // Holz
    g: '#4a4652', h: '#6b6672', i: '#8f8a92', j: '#b5afb0', l: '#d8d2cc',                        // Stein / Stahl
    m: '#1f3a2f', n: '#2f5a3a', o: '#467a42', p: '#6a9e4c', q: '#9cc65a', r: '#c8e07a',          // Grün
    s: '#5a2232', t: '#8c3040', u: '#b8474b', v: '#e0705a', w: '#f2a77a',                        // Ziegel / Dach
    x: '#23304f', y: '#355a7a', z: '#4f86a6', A: '#7fb4c8', B: '#c2e2e6',                        // Blau / Glas
    C: '#7a4a1c', D: '#c07a2a', E: '#e8a83a', F: '#f7d86a', G: '#fff3c0',                        // Gold / Licht
    H: '#f4ecdc', I: '#d9cbb3', J: '#fffaf0', K: '#6a2e5a', L: '#a3457a', M: '#d9709a', N: '#f2a8c0', // Putz / Blüten
    O: '#1f5a5a', P: '#2f8a7e', Q: '#5ab8a0', R: '#f0c09a', S: '#c88a6a',                        // Petrol / Haut
    T: '#3b3f4a', X: '#565b66', Y: '#7c818a', Z: '#a6abb1',                                       // Wellblech
    U: '#2a2440', V: '#ff9a3c', W: '#ffd56a', '%': '#4a5f86', '&': '#8eb0d0',                                                     // Fenster / Feuer
    '1': '#16302d', '2': '#1e463b', '3': '#2c6449', '4': '#468556', '5': '#73ab66', '6': '#b0d688', // Tanne
    '7': '#1a3424', '8': '#27532f', '9': '#3c7838', '0': '#5c9a42', '+': '#8cbf55', '*': '#c4e083'  // Laub
  };
  const OUTC = [36, 24, 42]; // Pflaumenton #24182a

  // ---------- Sprite-Engine ----------
  function groups(pts) {
    const key = p => p[0] + ',' + p[1], set = new Set(pts.map(key)), seen = new Set(), out = [];
    for (const p of pts) {
      const k = key(p); if (seen.has(k)) continue;
      let x0 = p[0], x1 = p[0], y0 = p[1], y1 = p[1]; const st = [p]; seen.add(k);
      while (st.length) {
        const [x, y] = st.pop(); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = (x + dx) + ',' + (y + dy); if (set.has(kk) && !seen.has(kk)) { seen.add(kk); st.push([x + dx, y + dy]); } }
      }
      out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return out;
  }
  // iPad/Safari kann im Hintergrund oder bei Speicherdruck den Inhalt von Zeichenflächen verwerfen (Gebäude wären dann unsichtbar).
  // Darum merken wir uns jede Sprite-Grafik und zeichnen sie neu, sobald ein Verlust erkannt wird.
  const SPRITES = [], RESTORE = [];
  function canvasLost() { const n = SPRITES.length; if (!n) return false;
    for (const i of [0, 1, Math.floor(n / 4), Math.floor(n / 2), Math.floor(n * 3 / 4), n - 1]) { const sp = SPRITES[Math.max(0, Math.min(n - 1, i))];
      try { if (sp.c.getContext('2d').getImageData(sp.px, sp.py, 1, 1).data[3] === 0) return true; } catch (e) { return false; } }
    return false; }
  function restoreAll() { for (const sp of SPRITES) { try { const g = sp.c.getContext('2d'); g.putImageData(sp.img, 0, 0); const fg = sp.f.getContext('2d'); fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, sp.f.width, sp.f.height); fg.translate(sp.f.width, 0); fg.scale(-1, 1); fg.drawImage(sp.c, 0, 0); fg.setTransform(1, 0, 0, 1, 0, 0); } catch (e) {} }
    RESTORE.forEach(fn => { try { fn(); } catch (e) {} }); }
  const onRestore = fn => RESTORE.push(fn);
  /* Zwischenbilder für Ruhendes (Himmel, Berge, Boden): nur neu zeichnen, wenn sich die Farben ändern. Schlüssel aus gerundeten Farbwerten. */
  const LCACHE = {};
  // ---------- Wetter (v134) ----------
  // Fest aus der Uhr berechnet, also für alle gleich. Ein Spieltag dauert DAY_MINUTES (10 Minuten).
  // An jedem zweiten Spieltag regnet es mit 40 % Wahrscheinlichkeit, 3 bis 6 Minuten lang; jeder dritte Regen ist ein Gewitter.
  // Ergebnis: { rain: 0..1 (Stärke, blendet weich ein und aus), storm: 0..1 }.
  // Zum Testen: window.FORCE_WX = 'regen' | 'gewitter' | 'klar' oder die Adresse mit ?wetter=regen aufrufen.
  const wxHash = n => { let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const WX_RULE = { everyDays: 2, chance: .4, stormShare: 1 / 3, minLen: .3, maxLen: .6, cloudIn: 12, rainIn: 8, rainOut: 8, cloudOut: 15 };   /* Übergang in Sekunden: erst ziehen Wolken auf, dann setzt der Regen ein; am Ende hört erst der Regen auf, dann ziehen die Wolken ab */
  function wetterPlan(d) { if (((d % WX_RULE.everyDays) + WX_RULE.everyDays) % WX_RULE.everyDays !== 0 || wxHash(d * 7 + 1) >= WX_RULE.chance) return null;
    const len = WX_RULE.minLen + wxHash(d * 7 + 2) * (WX_RULE.maxLen - WX_RULE.minLen); return { t0: wxHash(d * 7 + 3) * (1 - len), len, storm: wxHash(d * 7 + 4) < WX_RULE.stormShare }; }
  /* Nebel (v152): an etwa jedem fünften Tag ohne Regen, von spät abends (t > .9 des Vortags) bis zum Vormittag (t < .36), löst sich dann langsam auf */
  const nebelTag = d => wetterPlan(d) === null && wxHash(d * 7 + 5) < .2;
  try { const m = /[?&]wetter=(regen|gewitter|klar|nebel)/.exec(location.search); if (m) window.FORCE_WX = m[1]; } catch (e) {}
  function wetter(ms) {
    const F = window.FORCE_WX; if (F === 'regen') return { rain: 1, storm: 0, fog: 0 }; if (F === 'gewitter') return { rain: 1, storm: 1, fog: 0 }; if (F === 'klar') return { rain: 0, storm: 0, fog: 0 }; if (F === 'nebel') return { rain: 0, storm: 0, fog: 1 };
    const f = ms / ((window.DAY_MINUTES || 10) * 60000) + .35, d = Math.floor(f), t = f - d, p = wetterPlan(d);
    const fog = (t < .36 && nebelTag(d)) || (t > .9 && nebelTag(d + 1)) ? 1 : 0; if (!p) return { rain: 0, storm: 0, fog };
    const r = t >= p.t0 && t < p.t0 + p.len ? 1 : 0; return { rain: r, storm: p.storm ? r : 0, fog: r ? 0 : fog }; }
  /* Weicher Übergang (v136): wetter() sagt nur, was gerade gelten soll. wetterJetzt() führt den sichtbaren Zustand in jedem Bild dorthin:
     cloud (Wolkendecke) steigt zuerst, erst bei geschlossener Decke beginnt rain; umgekehrt beim Aufklaren. Gilt genauso für die Testknöpfe.
     going = die Wolken ziehen gerade ab. window.FORCE_WX_NOW = true springt ohne Übergang (für Tests). */
  const WXS = { cloud: 0, rain: 0, storm: 0, fog: 0, going: false, init: false };
  function wetterJetzt(ms, dt) { const z = wetter(ms), want = z.rain > .5, sw = want && z.storm > .5, S = WXS;
    if (!S.init || window.FORCE_WX_NOW || !(dt >= 0)) { S.init = true; S.cloud = S.rain = want ? 1 : 0; S.storm = sw ? 1 : 0; S.going = !want; S.fog = z.fog > .5 ? 1 : 0; }
    else { const d = Math.min(dt, .1);
      if (want) { S.going = false; S.cloud = Math.min(1, S.cloud + d / WX_RULE.cloudIn); if (S.cloud >= 1) S.rain = Math.min(1, S.rain + d / WX_RULE.rainIn); }
      else { S.going = true; S.rain = Math.max(0, S.rain - d / WX_RULE.rainOut); if (S.rain <= 0) S.cloud = Math.max(0, S.cloud - d / WX_RULE.cloudOut); }
      S.storm = sw && S.rain > .6 ? Math.min(S.rain, S.storm + d / 6) : Math.max(0, Math.min(S.rain, S.storm - d / 6));
      S.fog = z.fog > .5 ? Math.min(1, S.fog + d / 25) : Math.max(0, S.fog - d / 40); }   /* Nebel zieht in 25 s auf und löst sich in 40 s auf */
    return { cloud: S.cloud, rain: S.rain, storm: S.storm, fog: S.fog, going: S.going }; }
  // Farben des Tages bei Regen: grauer, dunkler, dazu ein kühler Schleier über allem
  function wetK(k, r, s) { if (!(r > .001)) return k; const o = { t: k.t, night: k.night };
    CK.forEach(c => { const v = k[c], g = v[0] * .3 + v[1] * .59 + v[2] * .11, grey = [g * .9 + 4, g * .94 + 6, g + 10], q = (c === 'top' || c === 'bot' || c === 'cloud' ? .8 : .5) * r, dk = 1 - (.13 + .1 * s) * r; o[c] = mix(v, grey, q).map(x => x * dk); });
    const t = k.tint, a2 = (.2 + .1 * s) * r, a = 1 - (1 - t[3]) * (1 - a2), w = a2 / (a2 + t[3] + 1e-6), c2 = mix([t[0], t[1], t[2]], mix([74, 86, 108], [22, 26, 44], k.night), w);   /* nachts ein dunkler statt eines hellgrauen Schleiers */ o.tint = [c2[0], c2[1], c2[2], a]; return o; }
  // Wetter zeichnen (v137): gemeinsam für den Werkshof und für den Blick durch die Hallenfenster
  const CALM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);   /* „weniger Bewegung“: kein Aufblitzen */
  function wetterHimmel(sc, k, wx, hz, time, vol) {   // Wolkendecke, Regenwolken, Blitz (Rückgabe: Helligkeit des Blitzes 0..1) und Donner
    const cl = wx.cloud === undefined ? wx.rain : wx.cloud, stm = wx.storm, n = k.night; let flash = 0; if (!(cl > .01)) return 0;
    {   // geschlossene Wolkendecke: grauer Schleier über Himmel, Sonne, Mond und Sternen, davor graue Haufenwolken
      const oc = mix(mix([118, 126, 140], [30, 34, 58], n), k.top, .4),   /* nachts dunkel, sonst würde der Himmel bei Regen heller als in klarer Nacht */ c2 = rgb(oc.map(v => v * .74)), c3 = rgb(oc.map(v => v * .6));
      sc.globalAlpha = Math.min(.9, (.52 + .2 * stm + .3 * n) * cl); R(sc, 0, 0, W, hz, rgb(oc));
      /* Regenwolken (v135): weiche graue Haufenwolken im Stil der Schönwetterwolken, nur wenig heller und dunkler als die Wolkendecke. Die dunklen Balken aus v134 sind weg */
      const cHi = rgb(mix(oc, [255, 255, 255], .2 * (1 - n) + .06)), cm = rgb(mix(oc, [255, 255, 255], .1 * (1 - n) + .03)), cu = rgb(oc.map(v => v * .88));
      sc.globalAlpha = .9 * cl * cl * (3 - 2 * cl);   /* v138: die grauen Wolken blenden an ihrem Platz weich ein und aus, sie ziehen nicht mehr schnell ins Bild oder hinaus; die Schönwetterwolken dahinter werden vom Schleier grau */ for (let i = 0; i < 8; i++) { const w = 46 + (i * 29) % 40, x = Math.round(((i * 71 + time * (1.2 + (i % 3) * .6)) % (W + w + 30)) - w - 15), b = 12 + (i * 17) % 40, nb = 3 + Math.floor(w / 16);
        for (let j = 0; j < nb; j++) { const dx = Math.round(6 + (j + .5) / nb * (w - 12)), r = 3 + ((i * 3 + j * 5) % 4) + (j === Math.floor(nb / 2) ? 2 : 0); for (let yy = -r; yy <= 0; yy++) { const hw = Math.round(Math.sqrt(r * r - yy * yy) * 1.5); R(sc, x + dx - hw, b - 3 + yy, hw * 2 + 1, 1, yy === -r ? cHi : cm); } }
        R(sc, x + 1, b - 3, w - 2, 1, cm); R(sc, x, b - 2, w, 1, cm); R(sc, x, b - 1, w, 1, cu); R(sc, x + 3, b, w - 6, 1, cu); }
      sc.globalAlpha = 1;
      if (stm > .5) {   // Gewitter: alle paar Sekunden ein Blitz hinter den Gebäuden, der Donner folgt mit Abstand
        const slot = Math.floor(time / 9), u = time - (slot * 9 + 1 + wxHash(slot * 3 + 12) * 4);
        if (wxHash(slot * 3 + 11) < .6) {
          const bx0 = 40 + wxHash(slot * 3 + 13) * (W - 80);
          if (u >= 0 && u < .34) { flash = u < .09 ? 1 : u < .17 ? .15 : u < .26 ? .6 : .2;
            sc.globalAlpha = flash * (CALM ? .1 : .3); R(sc, 0, 0, W, hz, '#e4ecff');
            let bx = bx0; for (let y = 4, j = 0; y < hz - 4; y += 3, j++) { const nx = bx + Math.round((wxHash(slot * 31 + j) - .5) * 9); sc.globalAlpha = flash * .35; R(sc, Math.min(bx, nx) - 1, y, Math.abs(nx - bx) + 3, 3, '#bcd0ff'); sc.globalAlpha = flash; R(sc, Math.min(bx, nx), y, Math.abs(nx - bx) + 1, 1, '#fffbe8'); R(sc, nx, y, 1, 3, '#fffbe8'); bx = nx; }
            sc.globalAlpha = 1; }
          SFX.edge('thun' + (slot % 6), u >= .5 + wxHash(slot * 3 + 14) * 1.6 && u < 5, 'thunder', { pan: SFX.panX(bx0), vol: vol === undefined ? .9 : vol }); } }
    }
    return flash; }
  /* Nebel (v152): Schleier über dem Himmel (auch hinter den Hallenfenstern) und, draußen, Nebel über der ganzen Szene.
     Je weiter hinten (weiter oben), desto dichter, in langsam ziehenden Schwaden. Lichter bekommen große, warme Lichthöfe,
     unter Laternen (pool) fällt ein Lichtkegel durch den Nebel. lamp = Stärke der Lichter (0 am Tag, 1 nachts). */
  const nebelFarbe = k => mix(mix([196, 188, 184], [52, 56, 78], k.night), k.bot, .25);
  function nebelHimmel(sc, k, wx, hz) { const f = wx.fog || 0; if (!(f > .01)) return; sc.globalAlpha = .82 * f; R(sc, 0, 0, W, hz, rgb(nebelFarbe(k))); sc.globalAlpha = 1; }
  const NBC = mk(W, H), NBG = NBC.getContext('2d'), NSC = mk(W * 2, H), NSG = NSC.getContext('2d');
  { const r = rng(11); for (let i = 0; i < 90; i++) { const x = r() * W * 2, y = r() * H, w = 40 + r() * 90, h = 5 + r() * 9; NSG.globalAlpha = .08 + r() * .1; NSG.fillStyle = '#ffffff'; NSG.beginPath(); NSG.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); NSG.fill(); if (x + w > W * 2) { NSG.beginPath(); NSG.ellipse(x - W * 2, y, w / 2, h / 2, 0, 0, Math.PI * 2); NSG.fill(); } } NSG.globalAlpha = 1; }
  function nebel(g, k, wx, L, lamp, time, gTop, gWater) { const f = wx.fog || 0; if (!(f > .01)) return;
    const fc = nebelFarbe(k), c = fc.map(Math.round).join(',');
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, `rgba(${c},${.9 * f})`); gr.addColorStop(Math.max(0, (gTop - 30) / H), `rgba(${c},${.9 * f})`);
    gr.addColorStop(gWater / H, `rgba(${c},${.46 * f})`); gr.addColorStop(1, `rgba(${c},${.5 * f})`); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    NBG.clearRect(0, 0, W, H); const off = Math.round(time * 1.6) % (W * 2); NBG.drawImage(NSC, -off, 0); NBG.drawImage(NSC, W * 2 - off, 0);   /* ziehende Schwaden */
    NBG.globalCompositeOperation = 'source-in'; NBG.fillStyle = `rgb(${c})`; NBG.fillRect(0, 0, W, H); NBG.globalCompositeOperation = 'source-over';
    g.globalAlpha = f; g.drawImage(NBC, 0, 0); g.globalAlpha = 1;
    if (!(lamp > .02) || !L) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const l of L) { if (l.hinten) continue; const cx = l.x + l.w / 2, cy = l.y + l.h / 2, lat = !!l.laterne, big = !!l.pool && !lat, r = big ? 34 : lat ? 15 : l.fire ? 13 : 6, a = (big ? .5 : lat ? .3 : l.fire ? .22 : .05) * f * lamp * (l.a === undefined ? 1 : l.a);   /* v159: Handlaternen im Nebel nur runder Schein, kein Straßenlaternen-Kegel */
      if (a < .01 || !isFinite(cx + cy + r)) continue; const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, `rgba(255,196,110,${a})`); rg.addColorStop(.4, `rgba(255,196,110,${a * .45})`); rg.addColorStop(1, 'rgba(255,196,110,0)');
      g.fillStyle = rg; g.fillRect(cx - r, cy - r, r * 2, r * 2);
      if (big) for (const [hw, q] of [[10, .45], [17, .32], [25, .23]]) {   /* weicher Kegel: drei übereinanderliegende Dreiecke, außen schwächer */
        const cg = g.createLinearGradient(0, cy, 0, cy + 40); cg.addColorStop(0, `rgba(255,200,120,${q * .32 * f * lamp})`); cg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = cg;
        g.beginPath(); g.moveTo(cx - 1.5, cy); g.lineTo(cx + 1.5, cy); g.lineTo(cx + hw, cy + 40); g.lineTo(cx - hw, cy + 40); g.closePath(); g.fill(); } }
    g.restore(); }
  /* Regenstreifen: schräge Tropfen in zwei Tiefen über die Fläche W x hgt. Die Seitwärtsbewegung wird aufsummiert (RDRIFT):
     ändert sich die Schräge (Regen wird zum Gewitter), springen die Tropfen nicht mehr zur Seite, sie neigen sich nur stärker. */
  const RAIN = Array.from({ length: 180 }, (_, i) => ({ x: wxHash(i * 5 + 1) * (W + 40), y: wxHash(i * 5 + 2) * (H + 12), s: .85 + wxHash(i * 5 + 3) * .3 })); let RDRIFT = 0;
  function regen(g, wx, time, dt, n, hgt) { const rn = wx.rain, stm = wx.storm; if (!(rn > .01)) return; const slant = .35 + .25 * stm, cnt = Math.round((130 + 50 * stm) * rn), dim = 1 - .35 * n; RDRIFT += slant * (dt || 0);
    for (let i = 0; i < cnt; i++) { const d = RAIN[i], near = i % 3 === 0, v = (near ? 300 : 215) * d.s, len = near ? 5 : 3;
      const yy = (d.y + time * v) % (hgt + 12) - 6, xx = (((d.x - RDRIFT * v) % (W + 40)) + W + 40) % (W + 40) - 8;
      g.globalAlpha = (near ? .62 : .4) * dim; for (let j = 0; j < len; j++) R(g, Math.round(xx - j * slant), Math.round(yy + j), 1, 1, near ? '#dbe8f5' : '#b9cbdc'); }
    g.globalAlpha = 1; }
  function cachedLayer(name, h, key, draw) { let c = LCACHE[name]; if (!c) { const cv = document.createElement('canvas'); cv.width = W; cv.height = h; c = LCACHE[name] = { cv, g: cv.getContext('2d'), key: null }; }
    if (c.key !== key) { c.g.clearRect(0, 0, W, h); draw(c.g); c.key = key; } return c.cv; }
  const kq = (...vals) => vals.map(v => Array.isArray(v) ? v.map(Math.round).join(',') : typeof v === 'number' ? v.toFixed(3) : String(v)).join('|');
  RESTORE.push(() => { for (const n in LCACHE) LCACHE[n].key = null; });   /* nach Speicherverlust (iPad) neu zeichnen */
  function buildSprite(rows, pal) {
    pal = pal || PAL;
    const h = rows.length, w = Math.max(...rows.map(r => r.length)), W2 = w + 2, H2 = h + 2;
    const px = new Array(W2 * H2).fill(null), win = [], fire = [];
    const hole = new Array(W2 * H2).fill(false);   // ',' = durchsichtig ohne Umriss (z. B. Lücken in Gitterwerk)
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const ch = r[x]; if (ch === ',') { hole[(y + 1) * W2 + x + 1] = true; continue; } if (ch === '.' || ch === ' ') continue; px[(y + 1) * W2 + x + 1] = hx(pal[ch] || '#ff00ff'); if (ch === 'U' || ch === '%' || ch === '&') win.push([x + 1, y + 1]); if (ch === 'V' || ch === 'W') fire.push([x + 1, y + 1]); } });
    const c = mk(W2, H2), g = c.getContext('2d'), img = g.createImageData(W2, H2), d = img.data;
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      let col = px[y * W2 + x];
      if (!col) {
        if (hole[y * W2 + x] || pal.__flat) continue;   /* __flat: Umriss ist schon im Bild (Figuren v148) */
        const ns = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < W2 && yy < H2 ? px[yy * W2 + xx] : null; }).filter(Boolean);
        if (!ns.length) continue;
        const avg = [0, 1, 2].map(i => ns.reduce((s, n) => s + n[i], 0) / ns.length); col = avg.map((v, i) => v + (OUTC[i] - v) * .65);
      }
      const o = (y * W2 + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const f = mk(W2, H2), fg = f.getContext('2d'); fg.translate(W2, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0);
    let pr = -1; for (let i = 3; i < d.length; i += 4) if (d[i]) { pr = (i - 3) / 4; break; }
    if (pr >= 0) SPRITES.push({ c, f, img, px: pr % W2, py: Math.floor(pr / W2) });   /* merken, um die Grafik nach einem Verlust neu zu zeichnen */
    return { c, f, w, h, win: groups(win), fire: groups(fire), rows };
  }
  // zeichnet Sprite mit Mittelpunkt cx und Unterkante b; sammelt Fenster für das Nachtleuchten
  function blit(g, s, cx, b, L, flip) {
    const x = Math.round(cx) - Math.floor(s.w / 2) - 1, y = Math.round(b) - s.h - 1;
    g.drawImage(flip ? s.f : s.c, x, y);
    if (OCC.on) OCC.list.push({ img: flip ? s.f : s.c, x, y });   // Personen merken: Lichtschein wird dort ausgespart
    if (L && !flip) s.win.forEach(r => L.push({ x: x + r.x, y: y + r.y, w: r.w, h: r.h }));
    return { x: x + 1, y: y + 1, s };
  }

  // ---------- Raster-Maler (für Gebäude) ----------
  function Grid(w, h) {
    const a = [...Array(h)].map(() => Array(w).fill('.'));
    const g = {
      w, h, a,
      set(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h && c) a[y][x] = c; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? a[y][x] : '.'; },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) g.set(x + i, y + j, typeof c === 'function' ? c(i, j, ww, hh) : c); },
      rows() { return a.map(r => r.join('')); }
    };
    return g;
  }
  // Material-Rampen: dunkel -> hell
  const RAMP = {
    brick: ['s', 't', 'u', 'v'], stone: ['g', 'h', 'i', 'j', 'l'], plaster: ['S', 'I', 'H', 'J'], wood: ['a', 'b', 'c', 'd', 'e', 'f'],
    metal: ['T', 'X', 'Y', 'Z'], blue: ['x', 'y', 'z', 'A'], teal: ['O', 'P', 'Q'], green: ['m', 'n', 'o', 'p', 'q'], gold: ['C', 'D', 'E', 'F'], roofR: ['s', 't', 'u']
  };
  const sh = (ramp, i) => { const r = RAMP[ramp]; return r[Math.max(0, Math.min(r.length - 1, i))]; };
  // Fläche mit Licht von links oben
  function fill(g, x, y, w, h, ramp, base) {
    g.rect(x, y, w, h, (i, j) => {
      let v = base;
      if (i === 0 || j === 0) v += 1;
      if (i >= w - 1 || j >= h - 1) v -= 1;
      if (i >= w - 3 && i < w - 1) v -= (i + j) % 2 ? 1 : 0;
      return sh(ramp, v);
    });
  }
  function brickWall(g, x, y, w, h) {
    g.rect(x, y, w, h, (i, j) => {
      const row = Math.floor(j / 3), joint = j % 3 === 2, vj = (i + (row % 2) * 3) % 6 === 0;
      let v = 1;
      if (joint || vj) v = 0;
      else if ((i * 7 + row * 13) % 11 === 0) v = 2;
      if (i < 2 && !joint) v = Math.min(3, v + 1);
      if (i >= w - 2) v = 0;
      if (j < 2 && v > 0) v--; if (j >= h - 2 && v > 0) v--;
      return sh('brick', v);
    });
  }
  function corrugated(g, x, y, w, h, base) { // Wellblech, senkrechte Rillen
    g.rect(x, y, w, h, (i, j) => { let v = base + (i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 0); if (j === 0) v++; if (i >= w - 2) v--; return sh('metal', v); });
  }
  // ---- Schattier-Werkzeug (wie innen, für außen ruhiger) ----
  const TR = { metal: ['g', 'T', 'X', 'Y', 'Z', 'l'], steel: ['g', 'h', 'i', 'j', 'l', 'H'], teal: ['O', 'O', 'P', 'Q', 'B'], gold: ['C', 'D', 'E', 'F', 'G'], glass: ['U', '%', '%', '&', 'B', 'J'], conc: ['g', 'h', 'i', 'j', 'l'] };
  const tn = (ramp, l, x, y) => { const R2 = TR[ramp] || ramp, n = R2.length, v = Math.max(0, Math.min(.999, (l + .25) / 1.25)) * n, i = Math.floor(v), f = v - i; return R2[Math.min(n - 1, i + (f > .55 ? 1 : f > .45 && (x + y) % 2 ? 1 : 0))]; };
  const sBox = (g, x0, y0, x1, y1, ramp, top) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { let l = (top === undefined ? .35 : top) - (y - y0) / Math.max(1, y1 - y0) * .35; if (x === x0 || y === y0) l += .35; if (x === x1 || y === y1) l -= .45; g.set(x, y, tn(ramp, l, x, y)); } };
  const RLR = ['abcdef', 'ghijl', 'TXYZ', 'xyzAB', 'OPQ', 'CDEFG', 'stuvw', 'SIHJ', 'mnopqr'].map(r => r.split('')), BY4 = [[0, .5], [.75, .25]];
  function relight(rows, k) {   // Licht von links oben: sanfter Verlauf, helle Kanten oben/links, Schlagschatten unter Vorsprüngen, wenig Dithering
    k = k === undefined ? 1 : k; const h = rows.length, w = Math.max(...rows.map(r => r.length)), A = rows.map(r => r.padEnd(w, '.').split(''));
    const get = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? '.' : (rows[y][x] || '.');
    const rampOf = c => RLR.find(q => q.includes(c));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = A[y][x]; if (c === '.') continue; const r = rampOf(c); if (!r) continue;
      let v = (.3 - y / Math.max(1, h - 1) * .6) * k;
      const up = get(x, y - 1), up2 = get(x, y - 2), dn = get(x, y + 1), lf = get(x - 1, y), rt = get(x + 1, y);
      if (up === '.') v += .75; else if (rampOf(up) !== r) v -= .7; else if (up2 !== '.' && rampOf(up2) !== r) v -= .35;   // Kante oben hell, Schatten unter Gesimsen und Stürzen
      if (dn === '.') v -= .5;
      if (lf === '.') v += .4; else if (rampOf(lf) !== r) v -= .3; if (rt === '.') v -= .4;
      const fl = Math.floor(v), f = v - fl, n = i0 => i0 + fl + (f > .62 ? 1 : f > .38 ? (BY4[y & 1][x & 1] < f - .38 + .25 ? 1 : 0) : 0);
      A[y][x] = r[Math.max(0, Math.min(r.length - 1, n(r.indexOf(c))))]; }
    return A.map(r => r.join(''));
  }
  const sCylV = (g, x0, y0, x1, y1, ramp) => { const w = x1 - x0; for (let x = x0; x <= x1; x++) { const nx = ((x - x0) / Math.max(1, w)) * 2 - 1, l = -nx * .55 + Math.sqrt(Math.max(0, 1 - nx * nx)) * .5; for (let y = y0; y <= y1; y++) g.set(x, y, tn(ramp, l + (y === y0 ? .3 : 0) - (y === y1 ? .35 : 0), x, y)); } };
  const sBall = (g, cx, cy, rx, ry, ramp) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny; if (d > 1) continue; let l = -nx * .55 - ny * .65 + Math.sqrt(1 - d) * .52; if (d > .8) l -= .3; g.set(x, y, tn(ramp, l, x, y)); } };
  function darken(g, x0, y0, w, h, steps) {   // Schatten (Traufe, Gesims, Sockel): Farbe innerhalb ihrer Rampe abdunkeln
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const c = g.get(x, y); if (c === '.') continue; const r = RLR.find(q => q.includes(c)); if (!r) continue; g.set(x, y, r[Math.max(0, r.indexOf(c) - steps)]); } }
  function windowAt(g, x, y, w, h, frame) { // Fenster: Rahmen, Schatten oben in der Laibung, Glas mit Verlauf und Spiegelung, Fensterbank; U/%/& leuchten nachts
    frame = frame || 'b';
    g.rect(x - 1, y - 1, w + 2, h + 2, frame); g.rect(x - 1, y - 1, w + 2, 1, sh(RLR.find(q => q.includes(frame)) ? 'stone' : 'stone', 0)); g.rect(x - 1, y - 1, w + 2, 1, frame);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let l = .75 - j / Math.max(1, h - 1) * .55 + ((i + j) % 9 < 2 ? .45 : 0); if (j === 0) l -= .55; g.set(x + i, y + j, tn('glass', l, x + i, y + j)); }
    if (w >= 3) for (let j = 0; j < h; j++) g.set(x + Math.floor(w / 2), y + j, frame);
    if (h >= 4) for (let i = 0; i < w; i++) g.set(x + i, y + Math.floor(h / 2), frame);
    g.rect(x - 1, y + h + 1, w + 2, 1, 'l'); // Fensterbank
  }
  function door(g, x, y, w, h, ramp) {   // Tür mit Fase, eingelassenen Feldern und Messinggriff
    const RM = { wood: ['a', 'b', 'c', 'd', 'e', 'f'], teal: 'teal', blue: ['x', 'y', 'z', 'A', 'B'] }[ramp || 'wood'] || ['a', 'b', 'c', 'd', 'e', 'f'];
    sBox(g, x, y, x + w - 1, y + h - 1, RM, .3);
    if (w >= 4 && h >= 8) { const ph = Math.floor((h - 4) / 2); for (const py of [y + 2, y + 3 + ph]) sBox(g, x + 1, py, x + w - 2, py + ph - 2, RM, -.15); }
    g.set(x + w - 2, y + Math.floor(h / 2), 'E'); g.set(x + w - 2, y + Math.floor(h / 2) - 1, 'F');
  }
  function gableRoof(g, x, y, w, h, ramp, base) { // Satteldach: Ziegelreihen, links im Licht, rechts im Schatten, heller First
    for (let j = 0; j < h; j++) {
      const half = Math.round((j + 1) / h * w / 2);
      for (let i = -half; i < half; i++) {
        const px = x + Math.floor(w / 2) + i;
        let v = base + (i < 0 ? 1 : 0) - (j % 3 === 2 ? 1 : 0) + (j < 2 ? 1 : 0) - (i >= 0 && j % 3 !== 2 && (px + j) % 7 === 0 ? 1 : 0);
        if (i === -half || i === half - 1) v = base - 1;
        g.set(px, y + j, sh(ramp, v));
      }
    }
  }
  function chimney(g, x, y, w, h) { brickWall(g, x, y, w, h); g.rect(x - 1, y, w + 2, 1, 'g'); g.rect(x - 1, y + 1, w + 2, 1, 'h'); }

  // ---------- gemütliche Details ----------
  function downpipe(g, x, y0, y1) { g.rect(x, y0, 1, y1 - y0, 'j'); g.rect(x + 1, y0, 1, y1 - y0, 'h'); for (let y = y0 + 3; y < y1; y += 6) { g.set(x, y, 'i'); g.set(x + 1, y, 'g'); } g.rect(x, y1 - 1, 3, 1, 'h'); }
  function flowerBox(g, x, y, w) { g.rect(x, y + 1, w, 2, 'c'); g.rect(x, y + 1, w, 1, 'd'); g.set(x, y + 2, 'b'); g.set(x + w - 1, y + 2, 'b');
    for (let i = 0; i < w; i++) { g.set(x + i, y, ['p', 'M', 'o', 'N', 'p', 'F', 'q'][(i * 5 + y) % 7]); if ((i + y) % 2 === 0) g.set(x + i, y - 1, ['o', 'N', 'p', 'M', 'q'][(i * 3 + y) % 5]); } }
  function wallLamp(g, x, y) { g.set(x - 1, y, 'g'); g.set(x, y, 'g'); g.set(x, y + 1, 'W'); g.set(x - 1, y + 1, 'C'); return [x, y + 1]; }
  function ivy(g, x, y1, len, seed) { const r = rng(seed); let px = x; for (let y = y1; y > y1 - len; y--) { if (g.get(px, y) === '.' || 'U%&'.includes(g.get(px, y))) break; g.set(px, y, (y % 3) ? 'o' : 'n'); if (r() < .55) { const dx = r() < .5 ? -1 : 1; if (g.get(px + dx, y) !== '.' && !'U%&'.includes(g.get(px + dx, y))) g.set(px + dx, y, r() < .5 ? 'p' : 'q'); } if (r() < .25) px += r() < .5 ? -1 : 1; } }
  function texture(g, seed) { // feine Materialstruktur: Putzflecken, Ziegelnuancen, Blechglanz
    const r = rng(seed);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.a[y][x], v = r();
      if (c === 'H' && v < .07) g.a[y][x] = v < .035 ? 'I' : 'J';
      else if (c === 'u' && v < .06) g.a[y][x] = 'v'; else if (c === 't' && v < .05) g.a[y][x] = 's';
      else if (c === 'Y' && v < .04) g.a[y][x] = 'Z'; else if (c === 'P' && v < .04) g.a[y][x] = 'Q'; }
  }

  // ---------- Gebäude ----------
  const B = {};
  // Pförtnerhaus (klein, verputzt, Flachdach, Schranke)
  B.pfoertner = () => {
    const g = Grid(30, 28);
    sBox(g, 1, 6, 22, 8, 'metal', .5); g.rect(0, 9, 24, 1, 'T');               // Dach mit Kante
    fill(g, 2, 10, 20, 18, 'plaster', 2);
    sBox(g, 2, 26, 21, 27, 'conc', .1); darken(g, 2, 10, 20, 2, 1);               // Sockel, Schatten unter dem Dach
    windowAt(g, 5, 13, 6, 5); door(g, 15, 15, 5, 11, 'teal');
    g.rect(14, 12, 7, 2, 'P'); g.set(15, 12, 'Q');                               // Schild
    brickWall(g, 15, 0, 4, 7); g.rect(14, 0, 6, 1, 'g'); g.rect(14, 1, 6, 1, 'h');       // Kamin, sitzt fest auf dem Dach
    g.rect(14, 6, 6, 1, 'g');                                                          // Blechanschluss am Dach
    sCylV(g, 22, 15, 23, 27, 'steel'); for (let x = 24; x < 30; x++) g.set(x, 17, (x >> 1) % 2 ? 'u' : 'J'); // Schranke direkt am Haus
    flowerBox(g, 4, 20, 8); downpipe(g, 2, 10, 26); const l1 = wallLamp(g, 14, 15);
    g.rect(1, 6, 22, 1, 'Z');                                                          // Dachkante glänzt
    return { g, chim: [[16, 0]], lamp: [[23, 12], l1] };
  };
  // Notstromaggregat (Kasten mit Auspuff)
  B.notstrom = () => {
    const g = Grid(16, 12);
    sBox(g, 1, 3, 13, 11, 'teal', .3);
    sBox(g, 2, 4, 5, 7, 'metal', -.2); for (let i = 0; i < 4; i++) g.set(2 + i, 5, 'Z');  // Lüftungsgitter
    g.rect(8, 5, 2, 2, 'E'); g.set(11, 5, 'q');                                  // Kontrolllampe
    sCylV(g, 12, 0, 13, 3, 'metal');
    g.rect(0, 11, 16, 1, 'g');
    return { g, chim: [[13, 0]], lamp: [[11, 5]] };
  };
  // Blechwerkstatt (Ziegelhalle, Satteldach, großes Tor)
  B.blechwerkstatt = () => {
    const g = Grid(58, 44);
    chimney(g, 44, 0, 4, 16);                                                            // Kamin steht im Dach
    gableRoof(g, 1, 4, 56, 14, 'metal', 2);
    g.rect(1, 17, 56, 1, 'T');
    brickWall(g, 3, 18, 52, 26);
    sBox(g, 3, 42, 54, 43, 'conc', 0);
    // großes Schiebetor: Bretter einzeln schattiert, Laufschiene oben
    for (let i = 0; i < 18; i += 3) sBox(g, 20 + i, 24, 22 + i, 43, ['a', 'b', 'c', 'd', 'e', 'f'], .35 - i * .01);
    g.rect(19, 23, 20, 1, 'g'); g.rect(20, 33, 18, 1, 'c');
    windowAt(g, 7, 24, 7, 7); windowAt(g, 44, 24, 7, 7);
    sBox(g, 22, 19, 35, 21, ['b', 'c', 'd', 'e', 'f'], .5); for (let i = 0; i < 12; i += 2) g.set(23 + i, 20, 'b');  // Schild
    windowAt(g, 26, 9, 6, 4);                                                           // Giebelfenster
    flowerBox(g, 6, 33, 9); flowerBox(g, 43, 33, 9); downpipe(g, 3, 17, 42); downpipe(g, 53, 17, 42);
    g.rect(2, 17, 54, 1, 'i'); g.rect(2, 18, 52, 1, 's');                                 // Dachrinne, Schatten unter der Traufe
    const l1 = wallLamp(g, 17, 25), l2 = wallLamp(g, 41, 25);
    for (let x = 6; x < 52; x += 5) if ((x * 3) % 7 < 3) g.set(x, 16, 'o');             // etwas Moos an der Traufe
    ivy(g, 6, 41, 12, 5); ivy(g, 50, 41, 9, 9);
    return { g, chim: [[46, 0]], door: [29, 34], lamp: [l1, l2] };
  };
  // Maschinenhalle (Sheddach mit Glasflächen, zwei Rolltore)
  B.maschinenhalle = () => {
    const g = Grid(80, 50);   // 2 Pixel höher: Rolltore sitzen unter den Fensterbänken
    // Sheddach: schräge Blechfläche mit Verlauf (oben am First hell), senkrechte Glasbänder mit Spiegelung, Firstkappe
    for (let k = 0; k < 4; k++) { const x0 = 2 + k * 19;
      for (let j = 0; j < 12; j++) { const len = Math.round((j + 1) / 12 * 16);
        for (let i = 0; i < len; i++) { const xx = x0 + 16 - len + i + 2, rib = (xx % 3 === 0) ? -.25 : 0; g.set(xx, 4 + j, tn('metal', .95 - j * .035 + rib * .6 - i * .008, xx, 4 + j)); }
        g.set(x0 + 17, 4 + j, 'T'); g.set(x0 + 18, 4 + j, tn('glass', .8 - j * .06 + ((j + k) % 5 === 1 ? .5 : 0), x0 + 18, 4 + j)); }
      g.set(x0 + 18, 3, 'Z'); g.set(x0 + 17, 3, 'Y'); }
    for (let x = 1; x < 79; x++) { g.set(x, 16, 'T'); g.set(x, 17, x % 6 === 0 ? 'X' : 'a'); }                                 // Traufe mit Rinne
    // Wellblech-Fassade: jede Rippe rund schattiert, Verlauf nach unten, dunkler Sockelbereich
    for (let y = 18; y < 48; y++) for (let x = 2; x < 78; x++) { const ph = x % 4, rib = [ .3, 0, 0, -.25][ph]; let l = rib + (y < 27 ? .45 : y < 40 ? .3 : .15); if (y < 20) l -= .5; if (y > 45) l -= .2; g.set(x, y, tn('teal', l, x, y)); }
    for (const x of [2, 39, 76]) sBox(g, x, 18, x + 1, 47, 'teal', .2);                                                        // Stützen
    // Fenster: tiefer Rahmen, Schatten oben in der Laibung, Glas mit Himmelsspiegelung, Fensterbank mit Schatten darunter
    for (const x0 of [6, 22, 43, 59]) {
      sBox(g, x0 - 1, 21, x0 + 13, 29, 'metal', -.1);
      for (let y = 22; y < 29; y++) for (let x = x0; x < x0 + 13; x++) { let l = .7 - (y - 22) * .08 + ((x - x0 + y) % 11 < 2 ? .35 : 0); if (y === 22) l -= .45; g.set(x, y, tn('glass', l, x, y)); }
      for (let i = 3; i < 13; i += 4) g.rect(x0 + i, 22, 1, 7, 'T'); g.rect(x0, 25, 13, 1, 'T');
      for (let x = x0 - 1; x < x0 + 14; x++) { g.set(x, 30, 'l'); g.set(x, 31, tn('teal', -.4, x, 31)); }
      for (let y = 32; y < 36; y++) if ((x0 + y) % 3) g.set(x0 + 4 + (y % 2), y, 'O');                                       // Regenspur
    }
    g.rect(2, 39, 76, 1, 'O');
    // Rolltore: Rollkasten, Lamellen mit Glanz, Führungsschienen, Warnstreifen, Schwelle
    [8, 56].forEach(x => {
      sBox(g, x - 2, 32, x + 17, 49, 'conc', -.3);
      sBox(g, x - 2, 32, x + 17, 34, 'metal', .3);
      for (let j = 35; j < 48; j++) for (let i = 0; i < 16; i++) { const ph = (j - 35) % 3; g.set(x + i, j, tn('metal', [.95, .7, .45][ph] - (j - 35) * .015 - i * .005, x + i, j)); }
      g.rect(x, 35, 16, 1, 'a'); sBox(g, x - 1, 35, x - 1, 47, 'steel'); sBox(g, x + 16, 35, x + 16, 47, 'steel', -.2);
      g.rect(x + 6, 46, 4, 1, 'E'); for (let i = 0; i < 16; i++) g.set(x + i, 48, (i >> 1) % 2 ? 'a' : 'E');
      for (let i = 0; i < 20; i++) g.set(x - 2 + i, 49, tn('conc', .4 - i * .02, x - 2 + i, 49));
    });
    // Firmenschild in Gold mit Relief
    sBox(g, 29, 35, 50, 37, 'gold', .4); for (let i = 0; i < 20; i += 2) g.set(30 + i, 36, 'C');
    const l1 = wallLamp(g, 37, 33), l2 = wallLamp(g, 45, 33);
    for (const x of [30, 47]) { sBox(g, x, 45, x + 3, 47, ['s', 't', 'u', 'v', 'w'], .3); g.rect(x, 43, 4, 2, 'o'); g.set(x + 1, 42, 'p'); g.set(x + 2, 41, 'q'); g.set(x + 2, 42, 'p'); g.set(x + 1, 43, 'q'); g.set(x, 43, 'n'); }
    for (let x = 2; x < 78; x++) { if ((x >= 6 && x <= 25) || (x >= 54 && x <= 73)) continue; if (g.get(x, 47) !== '.' && !'aE'.includes(g.get(x, 47))) g.set(x, 47, tn('teal', -.6, x, 47)); }   // Schatten am Boden (nicht über die Rolltore)
    return { g, chim: [], door: [18, 48], lamp: [l1, l2] };
  };
  // Prüflabor (weiß verputzt, zwei Geschosse, Flachdach, Antenne, Uhr)
  B.prueflabor = () => {   // drei Geschosse und Mansarddach mit Gauben: hoch genug, dass der Baum dahinter wirklich dahinter steht
    const g = Grid(50, 58);
    for (let j = 0; j < 12; j++) { const inset = Math.max(0, 4 - j); for (let x = 1 + inset; x < 49 - inset; x++) g.set(x, j, j % 3 === 2 ? 'T' : tn('metal', .75 - j * .05 - (x - 25) * .006, x, j)); }
    g.rect(5, 0, 40, 1, 'Z');
    for (const x of [8, 22, 36]) { g.rect(x - 1, 2, 8, 9, 'T'); g.rect(x, 3, 6, 1, 'Y'); fill(g, x, 4, 6, 6, 'plaster', 2); windowAt(g, x + 1, 5, 4, 4); }
    sBox(g, 0, 12, 49, 13, 'conc', .6); g.rect(1, 14, 48, 1, 'g');
    fill(g, 2, 15, 46, 41, 'plaster', 2); darken(g, 2, 15, 46, 2, 1);
    g.rect(2, 27, 46, 1, 'I'); g.rect(2, 40, 46, 1, 'I');
    for (let k = 0; k < 5; k++) { windowAt(g, 5 + k * 9, 17, 5, 7); flowerBox(g, 4 + k * 9, 26, 7); }
    for (let k = 0; k < 5; k++) { if (k === 2) continue; windowAt(g, 5 + k * 9, 30, 5, 7); flowerBox(g, 4 + k * 9, 39, 7); }
    disc2(g, 25, 33, 2, 'J', 'a');                                                   // Uhr
    for (const x of [5, 14, 32, 41]) { windowAt(g, x, 44, 5, 7); flowerBox(g, x - 1, 53, 7); }
    door(g, 22, 44, 7, 12, 'teal'); g.rect(21, 42, 9, 1, 'O');
    sBox(g, 2, 56, 47, 57, 'conc', 0);
    const l1 = wallLamp(g, 20, 44), l2 = wallLamp(g, 31, 44);
    downpipe(g, 46, 14, 56);
    return { g, chim: [], lamp: [l1, l2], door: [25, 57] };
  };
  // Kraftwerk (Ziegel, Rundbogenfenster, zwei Schornsteine)
  B.kraftwerk = () => {
    const g = Grid(62, 62);
    [[8, 4], [18, 0]].forEach(([x, y]) => {                                         // Schornsteine mit Streifen
      brickWall(g, x, y, 5, 26 - y);
      for (let j = y + 2; j < y + 6; j++) g.rect(x, j, 5, 1, j % 2 ? 'H' : 'u');
      g.rect(x - 1, y, 7, 1, 'g');
    });
    gableRoof(g, 26, 14, 34, 10, 'roofR', 1);
    g.rect(0, 25, 62, 2, 'T');
    brickWall(g, 1, 27, 60, 35);
    for (const x of [5, 51]) { windowAt(g, x, 34, 6, 12); g.rect(x, 33, 6, 1, 'b'); g.rect(x + 1, 32, 4, 1, 'b'); }
    // großes Rolltor in der Mitte: hier geht der Riesen-Mecha ein und aus
    g.rect(15, 31, 32, 30, 'T'); for (let x = 16; x < 46; x++) g.set(x, 32, (x >> 1) % 2 ? 'E' : 'a');            // Rahmen mit Warnstreifen
    for (let y = 33; y < 60; y++) for (let x = 17; x < 45; x++) g.set(x, y, (y - 33) % 3 === 0 ? 'T' : (y - 33) % 3 === 1 ? 'Y' : 'X');   // Lamellen
    sBox(g, 1, 60, 60, 61, 'conc', 0);
    g.rect(17, 59, 28, 1, 'a'); g.rect(29, 56, 4, 2, 'E');                                                            // Bodenleiste, Griff
    g.rect(26, 28, 10, 2, 'E'); g.rect(27, 28, 8, 1, 'F');                           // Blitz-Schild
    const pipe = (x0, x1, y0) => { for (let x = x0; x < x1; x++) { g.set(x, y0 - 1, 'a'); g.set(x, y0, 'F'); g.set(x, y0 + 1, 'E'); g.set(x, y0 + 2, 'D'); g.set(x, y0 + 3, 'C'); g.set(x, y0 + 4, 'a'); }   // Kupferrohr mit dunkler Kontur
      for (const fx of [x0 + 1, x1 - 3]) { g.rect(fx, y0 - 2, 2, 7, 'a'); g.set(fx, y0 - 1, 'h'); g.set(fx, y0, 'j'); g.set(fx, y0 + 1, 'i'); g.set(fx, y0 + 2, 'h'); g.set(fx, y0 + 3, 'g'); } };   // Flanschringe
    pipe(1, 15, 47);                                                                                                  // Rohrleitung links
    g.rect(7, 44, 1, 3, 'a'); for (const [dx, dy] of [[-2, -1], [-1, -2], [0, -2], [1, -2], [2, -1], [-2, 0], [2, 0], [-1, 1], [0, 1], [1, 1]]) g.set(7 + dx, 42 + dy, 'u'); g.set(7, 42, 'v'); g.set(6, 41, 'v');   // rotes Handrad
    pipe(47, 60, 47);                                                                                                 // Rohrleitung rechts
    g.rect(53, 52, 1, 2, 'a'); sBall(g, 53, 55, 2.5, 2.5, 'steel'); g.set(53, 55, 'J'); g.set(52, 54, 'J'); g.set(54, 55, 'a'); g.set(53, 54, 'u');   // Manometer am Stutzen
    sCylV(g, 40, 15, 43, 17, 'metal'); sBox(g, 39, 14, 44, 14, 'steel'); sCylV(g, 50, 18, 53, 20, 'metal'); sBox(g, 49, 17, 54, 17, 'steel'); // Dachlüfter
    const l1 = wallLamp(g, 13, 36), l2 = wallLamp(g, 50, 36);
    ivy(g, 3, 59, 22, 3); ivy(g, 58, 59, 16, 8);
    g.rect(1, 27, 60, 1, 's');
    return { g, chim: [[10, 4], [20, 0]], door: [31, 61], lamp: [l1, l2], gate: [17, 33, 28, 27] };
  };
  // Spielsymbol „Die Alte Fabrik“: klein fürs Torschild, groß (Zahnrad mit Fabrik) für Anmeldung und Tab-Symbol
  const EMBLEM_MINI = ['........a.', '..a..a..a.', '.ab.ab.ab.', 'abbabbabbb', 'bFbbFbbFbb', 'bFbbFbbFbb', 'aaaaaaaaaa'];   // dunkle Fabrik mit erleuchteten Fenstern auf dem Holzschild
  function emblemGrid() {
    const g = Grid(34, 34), c = 16.5, P = Math.PI;
    for (let y = 0; y < 34; y++) for (let x = 0; x < 34; x++) { const dx = x + .5 - c, dy = y + .5 - c, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), l = -dx / 16 * .5 - dy / 16 * .6;
      const tooth = ((a + P) / (2 * P) * 10 + .25) % 1 < .5;
      if (r < 11.2) { g.set(x, y, tn(['x', 'x', 'y', 'y', 'z'], .1 - dy / 30, x, y)); }
      else if (r < 14 || (r < 16.4 && tooth)) g.set(x, y, tn('gold', Math.min(.62, .42 + l * .45) + (r < 12.2 ? -.22 : 0) + (r > 14 ? -.08 : 0), x, y)); }
    const inC = (x, y) => Math.hypot(x + .5 - c, y + .5 - c) < 11.2;
    for (let y = 24; y < 30; y++) for (let x = 0; x < 34; x++) if (inC(x, y)) g.set(x, y, y === 24 ? 'q' : 'o');                        // Wiese
    for (let y = 17; y < 24; y++) for (let x = 8; x < 25; x++) g.set(x, y, (y % 3 === 0) ? 't' : ((x + (y % 6 < 3 ? 0 : 2)) % 4 === 0 ? 't' : 'u'));   // Ziegelhalle
    for (let k = 0; k < 3; k++) for (let j = 0; j < 5; j++) { const x0 = 8 + k * 5; for (let i = 0; i <= j; i++) g.set(x0 + i, 12 + j, 'Y'); g.set(x0 + j + 1, 12 + j, 'B'); }   // Sheddach mit Glasband
    for (let y = 7; y < 17; y++) { g.set(21, y, 'u'); g.set(22, y, 't'); g.set(23, y, 's'); } g.set(21, 9, 'J'); g.set(22, 9, 'J'); g.set(23, 9, 'H');   // Schornstein
    for (const [x, y] of [[23, 5], [24, 5], [24, 4], [25, 3], [26, 3], [26, 2]]) if (inC(x, y)) g.set(x, y, 'l');
    for (const x of [10, 14, 18]) { g.set(x, 19, 'F'); g.set(x + 1, 19, 'F'); g.set(x, 20, 'E'); g.set(x + 1, 20, 'E'); }                  // erleuchtete Fenster
    g.rect(14, 22, 3, 2, 'a');
    return g;
  }
  const EMBLEM = (() => { try { return buildSprite(emblemGrid().rows()); } catch (e) { return null; } })();
  // Eingangstor mit Bogen und Willkommensschild (Tutorial), immer instand
  B.tor = () => {
    const g = Grid(30, 36);
    for (const x0 of [0, 24]) { brickWall(g, x0, 10, 6, 26); g.rect(x0 - 1, 9, 8, 1, 'g'); sBox(g, x0, 7, x0 + 5, 8, 'conc', .5); sBox(g, x0 + 1, 6, x0 + 4, 6, 'conc', .7); sCylV(g, x0 + 2, 4, x0 + 3, 5, 'metal'); sBall(g, x0 + 3, 3, 1.5, 1.5, 'gold'); }
    // schmiedeeiserner Bogen
    for (let i = 6; i < 24; i++) { const d = (i - 14.5) / 9, y = Math.round(9 - 6 * (1 - d * d)); g.set(i, y, 'g'); g.set(i, y + 1, 'h'); if (i % 3 === 0) for (let yy = y + 2; yy < 12; yy++) g.set(i, yy, 'g'); }
    g.rect(6, 12, 18, 1, 'g');
    // Schild „?“: Holztafel mit Messingrand
    sBox(g, 9, 3, 20, 11, 'gold', .4); sBox(g, 10, 4, 19, 10, ['b', 'c', 'd', 'e', 'f'], .45);
    EMBLEM_MINI.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') g.set(10 + x, 4 + y, r[x]); });   // Spielsymbol: Fabrik mit Sheddach und Schornstein
    // offene Torflügel an den Pfeilern
    for (const [x0, dir] of [[6, 1], [23, -1]]) { for (let j = 14; j < 35; j++) { g.set(x0, j, 'g'); if (j % 4 === 2) g.set(x0 + dir, j, 'h'); } g.set(x0, 13, 'h'); }
    return { g, lamp: [[2, 3], [26, 3]] };
  };
  // Golem (Steinriese)
  // Golem: Form als Maske, Licht von links oben, Fugen, Moos, glühende Augen und Kern
  // Golem als Mecha in Schrägansicht (blickt nach links). Teile als Pixel-Vorlagen, damit er sich bewegen kann.
  // p = { bob: 0|1 (Oberkörper sinkt), head: -1|0|1 (Kopf dreht), swing: -2..2 (vorderer Arm), lift: 0|1 (hinterer Fuß hebt) }
  const GP = {
    head: ['.........u..', '....EFE..h..', '..jjllllljh.', '.jllllllliih', 'jllllliiiihh', 'VWWVVTTiiihh', 'TTTTTTTiihhT', '.hiiiiiihhT.', '..TTTTTTTT..'],
    torso: ['..jjlllljjjiih..', '.jllllllliiiihh.', 'jllllliiiiiiihhT', 'jlCCCliPPPPPPPhT', 'jCVWVCiOOOOOOOhT', 'jCWVVCiiiiiiihhT', 'jlCCClihhhhhhhhT', 'jlllllihTiTiTihT', 'jllllliiiiiiihhT',
      '.illllihhhhhhhT.', '..iiiiihhhhhhT..', '...TXXXXXXXXT...', '....TXTXTXTX....', '....XTXTXTXT....'],
    pack: ['..TT.TT.', '..YY.YY.', '..TT.TT.', '..TT.TT.', 'XYYYYYYX', 'XYTTTTYX', 'XYYYYYYX', 'XYTTTTYX', 'XYYYYYYX', 'XYTTTTYX', 'XYYYYYYX', 'XYTTTTYX', 'XXYYYYXX', '.XXXXXX.'],
    pauldron: ['...pop......', '.jllllljjjh.', 'jlllllllliih', 'jlDlllllDihh', 'POPPPPPPPPOT', 'OOOOOOOOOOOT', '.hiiiiiiihT.', '..TTTTTTTT..'],
    joint: ['TXXXT', 'XYYYX', 'TXXXT', 'XYYYX'],
    fore: ['.Tlllih.', 'Tllllihg', 'Tllllihg', 'DEFEEDDg', 'Tllllihg', 'Tllllihg', '.hiiihg.', 'Tjllliih', 'Tllllllg', 'Thlhlhig', 'Tllllllg', '.ggggggg.'],
    hip: ['.TXYYYYYYYXXT.', 'TXYYDDDYYYXXXT', '.TTTTTTTTTTTT.'],
    leg: ['..XYYYX..', '..XYTYX..', '..XYYYX..', '.jllllih.', 'jlDEEDiiT', '.jllllihT', '..jlllhT.', '..jPllhT.', '..jlllhT.', '..jlllhT.', '.TTXXXTT.', 'jlllllliih.', 'jllllllihhT', 'TTTTTTTTTT.']
  };
  const DARK = { l: 'i', j: 'i', i: 'h', h: 'g', P: 'O', D: 'C', E: 'D', F: 'D', Y: 'X' };
  B.golem = (p) => {
    p = p || {}; const bob = p.bob || 0, hd = p.head || 0, sw = p.swing || 0;
    const g = Grid(32, 44);
    const put = (rows, x, y, dark) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = r[i]; if (c !== '.') g.set(x + i, y + j, dark ? (DARK[c] || c) : c); } });
    put(GP.leg, 17, 30 - (p.lift || 0), 1);                        // hinteres Bein
    put(GP.fore, 19 - Math.sign(sw), 20 + bob, 1);                  // hinterer Arm
    put(GP.pack, 21, 9 + bob);                                       // Tornister mit Auspuff
    put(GP.leg, 7, 30);                                              // vorderes Bein
    put(GP.hip, 8, 27 + bob);
    put(GP.torso, 7, 13 + bob);
    put(GP.head, 2 + hd, 5 + bob);
    put(GP.joint, 16, 19 + bob);
    put(GP.pauldron, 13, 12 + bob);
    put(GP.fore, 14 + sw, 23 + bob - (Math.abs(sw) > 1 ? 1 : 0));   // vorderer Arm pendelt
    return { rows: g.rows() };
  };
  // kleine Hilfe: Kreis im Raster
  function disc2(g, cx, cy, r, c, edge) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) g.set(cx + x, cy + y, (x * x + y * y > (r - 1) * (r - 1) + 1) ? edge : c); }

  // Ruine aus dem reparierten Raster: Dachlöcher, kaputte Fenster, Risse, Efeu, Schutt
  function ruinOf(def, seed) {
    const src = def.g, g = Grid(src.w, src.h + 0), rnd = rng(seed);
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) g.a[y][x] = src.a[y][x];
    const top = y => { for (let x = 0; x < g.w; x++) if (g.get(x, y) !== '.') return x; return -1; };
    // Fenster: dunkel, Scherben
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if ('U%&'.includes(g.a[y][x])) g.a[y][x] = rnd() < .2 ? 'h' : 'a';
    // Dachlöcher oben (3 unregelmäßige Ausbrüche)
    let firstRow = 0; while (firstRow < g.h && top(firstRow) < 0) firstRow++;
    for (let k = 0; k < 3; k++) {
      const cx = Math.floor(g.w * (.2 + .6 * rnd())), cy = firstRow + 2 + Math.floor(rnd() * 8), r = 2 + Math.floor(rnd() * 3);
      const M = new Set();   // Loch: ausgefranster Rand aus Splittern, innen dunkel mit Dachlatten, oben offen zum Himmel
      for (let y = -r; y <= r; y++) for (let x = -r - 1; x <= r + 1; x++) { if (x * x * .7 + y * y > r * r + rnd() * 3) continue; if (g.get(cx + x, cy + y) === '.') continue; M.add((cx + x) + ',' + (cy + y)); }
      const inM = (x, y) => M.has(x + ',' + y);
      for (const key of M) { const [x, y] = key.split(',').map(Number);
        if (y < firstRow + 3) { g.set(x, y, '.'); continue; }
        const edgeTL = !inM(x - 1, y) || !inM(x, y - 1), edgeBR = !inM(x + 1, y) || !inM(x, y + 1);
        g.set(x, y, edgeTL ? (rnd() < .5 ? 'e' : 'd') : edgeBR ? 'c' : ((x + y) % 4 === 0 ? 'b' : (y - cy > 0 ? 'a' : 'b'))); }
    }
    // Risse
    for (let k = 0; k < 4; k++) {
      let x = Math.floor(rnd() * g.w), y = Math.floor(g.h * .45 + rnd() * g.h * .4);
      for (let s = 0; s < 6 + rnd() * 6; s++) { if (g.get(x, y) !== '.' && !'U%&'.includes(g.get(x, y))) g.set(x, y, 'a'); x += rnd() < .5 ? 1 : -1; y -= 1; }
    }
    // Efeu von unten
    const vines = 4 + Math.floor(rnd() * 4);
    for (let k = 0; k < vines; k++) {
      let x = Math.floor(rnd() * g.w), y = g.h - 1, len = 8 + Math.floor(rnd() * g.h * .5);
      for (let s = 0; s < len; s++) {
        if (g.get(x, y) === '.' && s > 2) break;
        g.set(x, y, s % 3 === 0 ? 'o' : 'n');
        if (rnd() < .35) g.set(x + (rnd() < .5 ? -1 : 1), y, rnd() < .5 ? 'p' : 'o');
        if (rnd() < .2) g.set(x + 1, y - 1, 'q');
        y--; if (rnd() < .3) x += rnd() < .5 ? -1 : 1;
      }
    }
    // Brettervernagelte Türen: Holz quer
    if (def.door) { const [dx, dy] = def.door; for (let i = -3; i <= 3; i++) { g.set(dx + i, dy - 6 + Math.round(i / 2), 'd'); g.set(dx + i, dy - 3 - Math.round(i / 2), 'c'); } }
    // Schutt am Fuß
    for (let k = 0; k < 10; k++) { const x = Math.floor(rnd() * g.w); g.set(x, g.h - 1, rnd() < .5 ? 'h' : 'i'); g.set(x + 1, g.h - 1, 'g'); if (rnd() < .4) g.set(x, g.h - 2, 'j'); }
    return g;
  }

  // ---------- Pflanzen (aus deinem „Stilles Ufer“) ----------
  const UFER = window.UFER_SPR || {};
  const SPR = {};
  Object.keys(UFER).forEach(k => SPR[k] = buildSprite(UFER[k], PAL));
  const BUILD = {};
  ['pfoertner', 'notstrom', 'blechwerkstatt', 'maschinenhalle', 'prueflabor', 'kraftwerk', 'tor'].forEach((k, i) => {
    const d = B[k](); texture(d.g, 3 + i);
    BUILD[k] = { def: d, ok: buildSprite(d.g.rows()), ruin: buildSprite(ruinOf(d, 11 + i * 7).rows()) };
  });
  SPR.golem = buildSprite(B.golem().rows);
  // Leerlauf-Bewegung: Gewicht verlagern, atmen, Arm pendeln, Kopf schaut sich um
  // Lackierungen für den fertigen Mecha (ersetzen die Stahl-Töne g h i j l H)
  const PAINT = { stahl: null,
    rot: { g: '#5a1f2a', h: '#8c2a32', i: '#b8403e', j: '#d8604e', l: '#f08a6a', H: '#ffd0b0' },
    blau: { g: '#14204a', h: '#22356f', i: '#33519a', j: '#4f74c2', l: '#7fa4e0', H: '#d0e0ff' },
    petrol: { g: '#123c40', h: '#1f5a5a', i: '#2f8a7e', j: '#4aa894', l: '#7fd0b8', H: '#d0f4e8' },
    tarn: { g: '#26331f', h: '#3c4f2a', i: '#56703a', j: '#76904c', l: '#a0b46a', H: '#dfe8b8' },
    gold: { g: '#6a3a10', h: '#a5641f', i: '#d09030', j: '#e8b84a', l: '#f7dc7a', H: '#fffbe0' } };
  const paintPal = id => PAINT[id] ? Object.assign({}, PAL, PAINT[id]) : PAL;
  // Riesen-Mecha klein für den Werkshof, von vorn wie im Kraftwerk: Kuppelkopf mittig mit Gitterkrone, breite runde Schulterpanzer,
  // orange Versorgungsschläuche über den Schultern, dunkle Tonne mit Energiekern, riesige Fäuste, kurze Beine mit Stiefeln.
  // p = { bob: 0|1, head: -1..1, lift: 0|1|2 (linkes/rechtes Bein hebt), rL, rR: 0..2 (Arm hebt), awake }
  B.mechaSmall = (p) => {
    p = p || {}; const g = Grid(32, 34), CX = 16, Bb = p.bob || 0, hd = p.head || 0, awake = p.awake !== false, sw = p.sw || 0;
    const SH = ['g', 'h', 'i', 'j', 'l', 'H'], DK = ['U', 'x', 'T', 'X', 'y', 'Y'], BY = [[0, .5], [.75, .25]];
    const shade = (ramp, l, x, y) => { if (ramp === SH) l -= .15; const n = ramp.length, v = Math.max(0, Math.min(.999, (l + .25) / 1.25)) * n, i = Math.floor(v), f = v - i; return ramp[Math.min(n - 1, i + (f > BY[y & 1][x & 1] + .12 ? 1 : 0))]; };
    const ball = (cx, cy, rx, ry, ramp) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny; if (d > 1) continue; let l = -nx * .55 - ny * .65 + Math.sqrt(1 - d) * .52; if (d > .72) l -= .3; g.set(x, y, shade(ramp, l, x, y)); } };
    const box = (x0, y0, x1, y1, ramp) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const nx = ((x - x0) / Math.max(1, x1 - x0)) * 2 - 1; let l = -nx * .55 + Math.sqrt(Math.max(0, 1 - nx * nx)) * .5; if (y === y0) l += .3; if (y === y1) l -= .4; g.set(x, y, shade(ramp, l, x, y)); } };
    const ln = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) g.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); };
    const X = (s, dx) => CX + s * dx, rzOf = s => s < 0 ? (p.rL || 0) : (p.rR || 0);
    for (const s of [-1, 1]) {   // Beine mit Stiefeln (beim Gehen hebt sich abwechselnd ein Bein)
      const up = (p.lift === 1 && s < 0) || (p.lift === 2 && s > 0) ? 2 : 0, lx = s < 0 ? CX - 8 : CX + 2;
      box(lx + 1, 24 + Bb, lx + 5, 27 - up, SH); g.rect(lx + 2, 25 + Bb, 3, 1, 'h'); box(lx + 1, 28 - up, lx + 5, 29 - up, DK);
      box(lx, 30 - up, lx + 6, 33 - up, DK); g.rect(lx, 30 - up, 7, 1, 'y'); g.rect(lx + 1, 32 - up, 5, 1, 'U'); }
    box(CX - 6, 22 + Bb, CX + 6, 24 + Bb, DK); g.rect(CX - 1, 22 + Bb, 3, 2, 'D'); g.set(CX, 22 + Bb, 'E');   // Becken
    ball(CX + .5, 17 + Bb, 7.5, 6.5, DK); g.rect(CX - 3, 22 + Bb, 7, 1, 'U');                                        // Rumpf
    for (let y = 13; y <= 19; y++) for (let x = -3; x <= 3; x++) g.set(CX + x, y + Bb, y === 13 ? (Math.abs(x) === 3 ? 'j' : 'l') : y === 19 ? 'h' : Math.abs(x) === 3 ? 'i' : 'j'); g.rect(CX - 3, 16 + Bb, 7, 1, 'i');   /* v158: Brustplatte gleichmäßig schattiert, damit der Kern mittig wirkt */                               // Brustplatte
    const cp = p.core === undefined ? 1 : p.core; for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) g.set(CX + x, 17 + Bb + y, x === 0 && y === 0 ? (awake ? (cp ? 'G' : 'W') : 'h') : x * y === 0 ? (awake ? (cp > 1 ? 'G' : 'W') : 'g') : (awake ? (cp > 1 ? 'W' : 'V') : 'U'));   /* v158: Kern pulsiert (core 0..2) */   // Energiekern
    for (const s of [-1, 1]) {   // Arme mit großen Fäusten (pendeln beim Gehen gegengleich)
      const ax = X(s, 11) + (p.schub ? s : 0), rz = p.schub ? 0 : rzOf(s), fy = 18 + Bb - rz * 4 + (p.schub ? 0 : s * sw); box(ax - 2, 14 + Bb, ax + 2, 18 + Bb, DK);
      box(ax - 3, fy, ax + 3, fy + 3, SH); g.rect(ax - 2, fy + 2, 5, 1, 'h');
      if (p.schub) { g.rect(ax - 2, fy + 4, 5, 1, 'T'); box(ax - 3, fy + 5, ax + 3, fy + 6, SH); g.rect(ax - 2, fy + 7, 5, 1, 'T'); g.rect(ax - 1, fy + 7, 3, 1, 'W'); g.set(ax, fy + 7, 'G'); continue; }   /* v158: Handfläche nach unten mit Düse */
      g.rect(ax - 2, fy + 4, 5, 1, 'T'); box(ax - 3, fy + 5, ax + 3, fy + 7, SH); g.set(ax - 2, fy + 6, 'D');   // Roboterhand: Gelenk, Handblock
      for (const fx of [ax - 2, ax, ax + 2]) { g.rect(fx, fy + 8, 1, 2, 'T'); g.set(fx, fy + 10, 'X'); } g.rect(s < 0 ? ax + 4 : ax - 4, fy + 6, 1, 3, 'T'); }   // drei Finger, Daumen innen
    for (const s of [-1, 1]) { const pts = [[X(s, 4), 11 + Bb], [X(s, 7), 8 + Bb], [X(s, 12), 8 + Bb], [X(s, 15), 12 + Bb], [X(s, 14), 18 + Bb - rzOf(s) * 3]]; for (let i = 0; i < pts.length - 1; i++) { ln(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'c'); ln(pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, 'b'); } }   // Versorgungsschläuche
    for (const s of [-1, 1]) { const cx = X(s, 10) + .5, cy = 11 + Bb; ball(cx, cy, 5.2, 4.8, SH); for (let a = 0; a < 6.28; a += .15) { const x = Math.round(cx + Math.cos(a) * 2.8), y = Math.round(cy + 1 + Math.sin(a) * 2.2); if (Math.sin(a) > 0) g.set(x, y, 'h'); } g.set(cx - 2, cy - 3, 'H'); }   // breite Schulterpanzer
    const hx = CX + hd, hy = 7 + Bb; ball(hx + .5, hy, 4.2, 4, SH);                                                    // Kuppelkopf mittig
    g.rect(hx - 1, hy - 5, 3, 2, 'h'); g.set(hx, hy - 5, awake ? 'u' : 'h');   // kurzer Kamm mit Signallampe
    g.rect(hx - 3, hy, 7, 1, 'x'); g.rect(hx - 3, hy + 1, 7, 1, 'U'); g.rect(hx - 2, hy + 2, 5, 1, 'U');           // Gesicht
    g.set(hx - 2, hy + 1, awake ? 'W' : 'u'); g.set(hx + 2, hy + 1, awake ? 'W' : 'u');                           // Augen
    return { rows: g.rows() };
  };
  // dasselbe Modell von der Seite (blickt nach links) zum Gehen: 4 Schrittbilder, Fäuste pendeln, Kopf mit einem leuchtenden Auge vorn
  B.mechaSide = (p, k) => {   // k = Maßstab: 1 im Werkshof, 3 im Kraftwerk (dann feiner gezeichnet, nicht nur vergrößert)
    p = p || {}; k = k || 1; const g = Grid(28 * k, 34 * k), CX = 13, fly = p.step === 'fly', f = fly ? 2 : p.step || 0, Bb = f % 4 < 2 ? 1 : 0, awake = p.awake !== false;   /* sackt beim Auftreten ein Pixel ab */
    const SH = ['g', 'h', 'i', 'j', 'l', 'H'], DK = ['U', 'x', 'T', 'X', 'y', 'Y'], BY = [[0, .5], [.75, .25]];
    const shade = (ramp, l, x, y) => { if (ramp === SH) l -= .15; const n = ramp.length, v = Math.max(0, Math.min(.999, (l + .25) / 1.25)) * n, i = Math.floor(v), q = v - i; return ramp[Math.min(n - 1, i + (q > BY[y & 1][x & 1] + .12 ? 1 : 0))]; };
    const set = (x, y, c) => g.rect(Math.round(x * k), Math.round(y * k), k, k, c), rect = (x, y, w, h, c) => g.rect(Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k), c);
    const ball = (cx, cy, rx, ry, ramp, dark) => { for (let Y = Math.floor((cy - ry) * k); Y <= Math.ceil((cy + ry) * k); Y++) for (let X = Math.floor((cx - rx) * k); X <= Math.ceil((cx + rx) * k); X++) { const ny = ((Y + .5) / k - cy) / ry, nxx = ((X + .5) / k - cx) / rx, d = nxx * nxx + ny * ny; if (d > 1) continue; let l = -nxx * .55 - ny * .65 + Math.sqrt(1 - d) * .52 - (dark || 0); if (d > .72) l -= .3; g.set(X, Y, shade(ramp, l, X, Y)); } };
    const box = (x0, y0, x1, y1, ramp, dark) => { const X0 = Math.round(x0 * k), X1 = Math.round((x1 + 1) * k) - 1, Y0 = Math.round(y0 * k), Y1 = Math.round((y1 + 1) * k) - 1;   /* v165: auch für Zwischenwerte (feine Hand) */ for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) { const nx = ((X - X0) / Math.max(1, X1 - X0)) * 2 - 1; let l = -nx * .55 + Math.sqrt(Math.max(0, 1 - nx * nx)) * .5 - (dark || 0); if (Y < Y0 + Math.max(1, k >> 1)) l += .3; if (Y > Y1 - Math.max(1, k >> 1)) l -= .4; g.set(X, Y, shade(ramp, l, X, Y)); } };
    const ln = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * k || 1, tw = Math.max(1, Math.round(k * .7)); for (let i = 0; i <= n; i++) g.rect(Math.round((x0 + (x1 - x0) * i / n) * k), Math.round((y0 + (y1 - y0) * i / n) * k), tw, tw, c); };
    /* 8 Schrittbilder, schwerer Gang: Ein Fuß steht fest und wandert relativ zum Körper um je 2 px nach hinten (der Körper rückt genau so weit vor),
       der andere schwingt angehoben nach vorn. Bei Bild 0 und 4 stehen beide Füße (Auftreten, Körper sackt ab). */
    const S8 = 4, legAt = ph => ph < .5 ? { x: Math.round(-S8 + ph * 4 * S8), up: 0 } : (q => ({ x: Math.round(S8 - q * 2 * S8), up: Math.round(Math.sin(q * Math.PI) * 2.4) }))((ph - .5) * 2);
    const LF = fly ? { x: 2, up: 2 } : legAt((f % 8) / 8), LB = fly ? { x: -1, up: 1 } : legAt(((f % 8) / 8 + .5) % 1);   /* fly: Beine hängen im Flug */
    const leg = (dx, lift, dark) => { const t = Math.round(dx * .35), s2 = Math.round(dx * .7); box(CX + t, 22 + Bb, CX + 3 + t, 25, SH, dark); box(CX + s2, 26 - lift, CX + 2 + s2, 29 - lift, DK, dark); box(CX - 2 + dx, 30 - lift, CX + 3 + dx, 33 - lift, DK, dark); rect(CX - 2 + dx, 30 - lift, 6, 1, dark ? 'T' : 'Y'); set(CX - 2 + dx, 32 - lift, dark ? 'U' : 'D'); };   /* Stiefel mit Messingkappe an der Spitze */
    /* v158: Arm schwingt um Schulter und Ellenbogen (gedreht, nicht verschoben); vorn läuft der Versorgungsschlauch am Arm entlang */
    /* v165: fein gezeichnet (k > 1): Ober- und Unterarm als durchgehende Zylinder statt gestapelter Kästchen, Hand ohne Löcher beim Abknicken */
    const FEIN = k > 1, seg = (x0, y0, x1, y1, r, ramp, dark) => { const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, vx = uy, vy = -ux, px = vx >= 0 ? 1 : -1;
      for (let Y = Math.floor((Math.min(y0, y1) - r) * k); Y <= Math.ceil((Math.max(y0, y1) + r) * k); Y++) for (let X = Math.floor((Math.min(x0, x1) - r) * k); X <= Math.ceil((Math.max(x0, x1) + r) * k); X++) {
        const qx = (X + .5) / k - x0, qy = (Y + .5) / k - y0, t = qx * ux + qy * uy, n = (qx * vx + qy * vy) * px / r; if (t < 0 || t > L || Math.abs(n) > 1) continue;
        let l = -n * .55 + Math.sqrt(Math.max(0, 1 - n * n)) * .5 - (dark || 0); if (t < .5) l += .3; if (t > L - .5) l -= .4; g.set(X, Y, shade(ramp, l, X, Y)); } };
    const arm = (sw, dark) => { const ax = CX + 3, sy = 13 + Bb, a1 = -sw / 4 * .26 + .08, a2 = a1 * 1.2 + .12, e = [ax - Math.sin(a1) * 4, sy + Math.cos(a1) * 4], w = [e[0] - Math.sin(a2) * 4, e[1] + Math.cos(a2) * 4];
      if (FEIN) { seg(ax + .5, sy, e[0] + .5, e[1] + 1, 1.5, DK, dark); seg(e[0] + .5, e[1] + 1, w[0] + .5, w[1] + 1, 2.5, SH, dark); }
      else { for (let t = 0; t <= 4; t++) { const px = Math.round(ax - Math.sin(a1) * t), py = Math.round(sy + Math.cos(a1) * t); box(px - 1, py, px + 1, py, DK, dark); }
        for (let t = 1; t <= 4; t++) { const px = Math.round(e[0] - Math.sin(a2) * t), py = Math.round(e[1] + Math.cos(a2) * t); box(px - 2, py, px + 2, py, SH, dark); } }
      const ex = FEIN ? e[0] : Math.round(e[0]), ey = FEIN ? e[1] + .5 : Math.round(e[1]); rect(ex - 1, ey, 3, 1, dark ? 'U' : 'T'); set(ex, ey, dark ? 'T' : 'D');
      if (!dark) { ln(CX + 7, 9 + Bb, ax + 2, sy, 'c'); ln(ax + 2, sy, ex + 2, ey, 'c'); ln(ex + 2, ey, (FEIN ? w[0] : Math.round(w[0])) + 3, (FEIN ? w[1] : Math.round(w[1])) - 1, 'b'); }
      const Bh = FEIN ? w[1] + 1 - 20 : Math.round(w[1]) - 20; const hx = FEIN ? w[0] : Math.round(w[0]), a3 = a2 + .12, snap = g.a.map(r => r.slice());
      if (FEIN) for (const r of g.a) r.fill('.');   // Hand auf leerem Blatt zeichnen, damit beim Drehen kein Pixel fehlt
      rect(hx - 1, 20 + Bh, 3, 1, 'T'); box(hx - 2, 21 + Bh, hx + 2, 23 + Bh, SH, dark); for (const fx of [hx - 2, hx]) { rect(fx, 24 + Bh, 1, 2, dark ? 'U' : 'T'); set(fx, 26 + Bh, dark ? 'T' : 'X'); } rect(hx + 2, 23 + Bh, 1, 2, dark ? 'U' : 'T'); 
      { const hp = {}; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (FEIN ? g.a[y][x] !== '.' : g.a[y][x] !== snap[y][x]) hp[x + ',' + y] = g.a[y][x];   /* v158: Hand knickt im Handgelenk */
        for (let y = 0; y < g.h; y++) g.a[y] = snap[y];
        const PX = hx * k + k / 2, PY = (20 + Bh) * k, ca = Math.cos(a3), sa = Math.sin(a3); for (let y = FEIN ? Math.floor(PY - 2 * k) : PY - 2 * k; y <= PY + 10 * k; y++) for (let x = FEIN ? Math.floor(PX - 8 * k) : PX - 8 * k; x <= PX + 8 * k; x++) { const X2 = x + .5 - PX, Y2 = y + .5 - PY, c = hp[Math.floor(PX + X2 * ca + Y2 * sa) + ',' + Math.floor(PY - X2 * sa + Y2 * ca)]; if (c) g.set(Math.round(x), Math.round(y), c); } } };   /* Roboterhand */
    leg(LB.x, LB.up, .9);                                  // hinteres Bein (im Schatten)
    const armS = q => Math.cos(((f % 8) / 8 + q) * Math.PI * 2 - .9) * 3.4;   /* v158: nachlaufend, schwächer */
    arm(fly ? 2 : armS(.5), .7);                                       // hinterer Arm (v165: schwingt mit dem vorderen Bein, also gegengleich zum hinteren)
    ball(CX + 6, 10 + Bb, 3.8, 3.6, SH, .4);           // hinterer Schulterpanzer
    ball(CX + 9, 11 + Bb, 2.6, 2, SH, .15); ball(CX + 9, 16 + Bb, 2.6, 2, SH, .3); box(CX + 7, 11 + Bb, CX + 11, 16 + Bb, SH, .15); rect(CX + 7, 13 + Bb, 5, 1, 'X'); rect(CX + 8, 18 + Bb, 3, 1, 'T'); rect(CX + 10, 7 + Bb, 1, 3, 'X'); set(CX + 11, 6 + Bb, 'Y');   /* v158: Rückentank mit Band, Düse und Auspuff */
    box(CX - 4, 20 + Bb, CX + 6, 22 + Bb, DK); set(CX - 3, 21 + Bb, 'D');   // Becken
    ball(CX + 1, 15 + Bb, 5.5, 6.5, DK); box(CX - 5, 11 + Bb, CX - 3, 18 + Bb, SH); set(CX - 5, 15 + Bb, awake ? 'W' : 'g'); set(CX - 4, 15 + Bb, awake ? 'V' : 'U');   // Rumpf, Brustplatte vorn mit Kern
    { const pd = FEIN && !fly ? Math.sin((f % 8) / 8 * Math.PI * 2 - 1.2) * .7 : 0; ln(CX + 6, 18 + Bb, CX + 8 + pd, 13 + Bb, 'c'); ln(CX + 8 + pd, 13 + Bb, CX + 6, 8 + Bb, 'c'); ln(CX + 7, 18 + Bb, CX + 9 + pd, 13 + Bb, 'b'); }   // Versorgungsschlauch am Rücken (v165: pendelt im Schritt mit, fein gezeichnet)
    leg(LF.x, LF.up, 0);                                   // vorderes Bein
    ball(CX + 3, 10 + Bb, 4.6, 4.3, SH); for (let q = 0; q < 6.28; q += .15 / k) { const X = Math.round((CX + 3 + Math.cos(q) * 2.4) * k), Y = Math.round((11 + Bb + Math.sin(q) * 2) * k); if (Math.sin(q) > 0) g.set(X, Y, 'h'); } set(CX + 1, 7 + Bb, 'H');   // vorderer Schulterpanzer
    const hx = CX - 2, hy = 6 + Bb; ball(hx, hy, 3.8, 3.8, SH);                                             // Kuppelkopf (vor der Schulter)
    rect(hx, hy - 4, 2, 1, 'h'); set(hx + 1, hy - 5, 'j'); set(hx + 1, hy - 6, awake ? 'u' : 'h'); set(hx + 3, hy - 5, 'h');   /* v158: Sensormast mit Signallampe, Antenne dahinter */
    rect(hx - 4, hy, 4, 1, 'x'); rect(hx - 4, hy + 1, 4, 1, 'U'); rect(hx - 3, hy + 2, 3, 1, 'U'); set(hx - 3, hy + 1, awake ? 'W' : 'u');   // Gesicht vorn, ein Auge
    arm(fly ? 1 : armS(0), 0);                                          // vorderer Arm (v165: gegengleich zum vorderen Bein)
    return { rows: g.rows() };
  };
  SPR.mechaSideC = {}; SPR.mechaSideFrame = (p, paint, sc) => { const k = [p.step, p.awake, paint, sc || 1].join(','); return SPR.mechaSideC[k] || (SPR.mechaSideC[k] = buildSprite(B.mechaSide(p, sc || 1).rows, paintPal(paint))); };
  SPR.mechaYard = {}; SPR.mechaYardFrame = (p, paint) => { const k = [p.bob, p.head, p.lift, p.rL, p.rR, p.sw, p.awake, p.core, p.schub, paint].join(','); return SPR.mechaYard[k] || (SPR.mechaYard[k] = buildSprite(B.mechaSmall(p).rows, paintPal(paint))); };
  SPR.golemPose = {}; SPR.golemFrame = (p) => { const k = [p.bob, p.head, p.swing, p.lift].join(','); return SPR.golemPose[k] || (SPR.golemPose[k] = buildSprite(B.golem(p).rows)); };
  // gemütliche Laubbäume: Krone aus Ballen, Licht von links oben
  function cozyTree(w, h, seed, ramp, trunkH) {
    const g = Grid(w, h), r = rng(seed), blobs = [], cy0 = h - trunkH - 1;
    const n = 6 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = (w / 2 - 5) * (.55 + r() * .3); blobs.push({ x: w / 2 + Math.cos(a) * rr * .8, y: (cy0) / 2 + 2 + Math.sin(a) * rr * .6, r: 5 + r() * 3 }); }
    blobs.push({ x: w / 2, y: cy0 / 2 + 1, r: w / 3.2 }, { x: w / 2 - 2, y: cy0 / 2 - 3, r: w / 4.5 });
    // Stamm mit Ast
    for (let y = cy0 - 6; y < h; y++) { const ww = y > h - 3 ? 4 : 2; for (let i = 0; i < ww; i++) g.set(Math.floor(w / 2) - 1 + i - (ww > 2 ? 1 : 0), y, i === 0 ? 'c' : i === ww - 1 ? 'a' : 'b'); }
    for (let i = 0; i < 4; i++) g.set(Math.floor(w / 2) + 1 + i, cy0 - 3 - i, 'b');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let best = null, bd = 1;
      for (const b of blobs) { const d = Math.hypot(x - b.x, (y - b.y) * 1.1) / b.r; if (d < bd || (d < 1 && b.y > (best || { y: -1 }).y && d < .9)) { bd = d; best = b; } }
      if (!best || bd >= 1) continue;
      if (y > cy0 - 2 && g.get(x, y) !== '.') continue;
      const lx = (x - best.x) / best.r, ly = (y - best.y) / best.r; let v = 2.3 - (lx + ly) * 1.6 - (y / h) * 1.2 + (r() - .5) * .9;
      if (bd > .82) v -= .8;
      g.set(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(v)))]);
    }
    return g.rows();
  }
  SPR.cozyTree = buildSprite(cozyTree(30, 38, 4, ['7', '8', '9', '0', '+', '*'], 9));
  SPR.cozyTree2 = buildSprite(cozyTree(24, 31, 9, ['7', '8', '9', '0', '+', '*'], 7));
  SPR.autumnTree = buildSprite(cozyTree(26, 34, 17, ['b', 'C', 'D', 'E', 'F', 'G'], 8));
  SPR.tallPine = buildSprite((() => { const g = Grid(23, 46), r = rng(41);   // hohe Tanne: Etagen mit Licht von links, dunkle Unterseiten, Stamm
    g.rect(10, 38, 3, 8, 'b'); g.rect(10, 38, 1, 8, 'c'); g.set(12, 45, 'a');
    for (let k = 0; k < 7; k++) { const top = 1 + k * 5, h = 9, half = 3 + k * 1.3; for (let y = 0; y < h; y++) { const w = Math.round(1 + (y / (h - 1)) * half); for (let x = -w; x <= w; x++) { const u = (x + w) / (2 * w + 1); let c = y === h - 1 ? '1' : u < .3 ? (y < 3 ? '5' : '4') : u < .7 ? '3' : '2'; if (r() < .08) c = '4'; g.set(11 + x, top + y, c); } } }
    g.set(11, 0, '4'); return g.rows(); })());
  SPR.appleTree = buildSprite((() => { const rows = cozyTree(24, 30, 23, ['7', '8', '9', '0', '+', '*'], 8), r = rng(31);   // Apfelbaum: Krone mit roten Äpfeln
    return rows.map((row, y) => row.split('').map((c, x) => ('90+'.includes(c) && y < 20 && r() < .07) ? 'u' : ('8'.includes(c) && y < 20 && r() < .04) ? 'v' : c).join('')); })());

  SPR.cherryTree = buildSprite((() => { const rows = cozyTree(22, 27, 11, ['K', 'L', 'M', 'M', 'N', 'J'], 7), r = rng(17);   // Kirschbaum in Blüte, ein paar grüne Blätter
    return rows.map((row, y) => row.split('').map(c => ('LM'.includes(c) && r() < .06) ? 'p' : c).join('')); })());

  // ---------- Tageszeiten ----------
  const CK = ['top', 'bot', 'far', 'near', 'tree', 'grass', 'shore', 'water', 'cloud'];
  const DAYK = { top: '#6fb3df', bot: '#f5e4c6', far: '#a9b6cc', near: '#82a68c', tree: '#45744d', grass: '#86b45a', shore: '#cdb596', water: '#4ea4bc', cloud: '#fffaf0', tint: [255, 196, 140, .07], night: 0 };
  const NIGHTK = { top: '#0a0f2e', bot: '#262a5c', far: '#2a2e57', near: '#1e2247', tree: '#141a33', grass: '#1c2a34', shore: '#38364c', water: '#131b3f', cloud: '#383a66', tint: [28, 30, 92, .56], night: 1 };
  const KF = [
    Object.assign({ t: 0 }, NIGHTK),
    { t: .17, top: '#2c2c6c', bot: '#f39c8a', far: '#6c5c8c', near: '#4f4a76', tree: '#2d394b', grass: '#4a6a4c', shore: '#8c7c78', water: '#5c5a8c', cloud: '#f6bcb2', tint: [255, 150, 140, .16], night: .35 },
    Object.assign({ t: .27 }, DAYK),
    Object.assign({ t: .63 }, DAYK),
    { t: .74, top: '#4b3a8c', bot: '#ff9b5c', far: '#9c5c8c', near: '#6b406f', tree: '#3a2f4b', grass: '#6f7d42', shore: '#a5806a', water: '#a15c7c', cloud: '#ffb38c', tint: [255, 110, 70, .2], night: .3 },
    { t: .84, top: '#131a46', bot: '#4b3a7c', far: '#3a3566', near: '#2a2853', tree: '#1a1d39', grass: '#22303b', shore: '#45405a', water: '#1d2352', cloud: '#4a4778', tint: [40, 35, 100, .5], night: .9 },
    Object.assign({ t: 1 }, NIGHTK)
  ].map(k => { const o = { t: k.t, tint: k.tint, night: k.night }; CK.forEach(c => o[c] = hx(k[c])); return o; });
  function skyAt(t) {
    let i = 0; while (i < KF.length - 2 && t >= KF[i + 1].t) i++;
    const a = KF[i], b = KF[i + 1]; let f = (t - a.t) / (b.t - a.t); f = Math.max(0, Math.min(1, f)); f = f * f * (3 - 2 * f);
    const o = { night: a.night + (b.night - a.night) * f, tint: a.tint.map((v, j) => v + (b.tint[j] - v) * f) };
    CK.forEach(c => o[c] = mix(a[c], b[c], f)); return o;
  }
  function tint(g, w, h, t) { if (t[3] < .01) return; g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(${t[0] | 0},${t[1] | 0},${t[2] | 0},${t[3]})`; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
  // Lichtschein-Ebene: Personen (und was sonst vorne steht) werden aus dem Schein ausgeschnitten, damit er sie nicht überdeckt
  const GLC = mk(W, H), GLG = GLC.getContext('2d'), MKC = mk(W, H), MKG = MKC.getContext('2d');
  /* Düsenflamme (v131): oben an der Düse breit, läuft nach unten spitz aus wie ein echter Triebwerksstrahl. x, y = linke obere Ecke an der Düse, w = Breite, len = Länge */
  const flame = (g, x, y, w, len) => { [['#ff5a2c', 1, 1], ['#ff7a2c', .78, .82], ['#ffd56a', .5, .6], ['#fffaf0', .2, .38]].forEach(([c, fw, fl]) => { const n = Math.max(1, Math.round(len * fl)), bw = Math.max(1, Math.round(w * fw));
    for (let i = 0; i < n; i++) { let wi = Math.max(1, Math.round(bw * (1 - Math.pow(i / n, 1.3)))); if ((w - wi) % 2) wi = Math.max(1, wi - 1);   /* gleiche Parität wie w: jede Zeile sitzt genau mittig */ R(g, Math.round(x) + Math.floor((w - wi) / 2), Math.round(y) + i, wi, 1, c); } }); };
  function glowPass(sc, L, alphaOf, extra) {
    GLG.clearRect(0, 0, W, H); for (const l of L) { const a = alphaOf(l); if (a > .03) glow(GLG, l, a); }
    if (extra) extra(GLG);   /* weiteres Licht (Suchscheinwerfer), wird wie der Schein an Figuren ausgespart */
    if (OCC.list.length) { MKG.clearRect(0, 0, W, H); for (const o of OCC.list) { MKG.globalCompositeOperation = o.cover ? 'destination-out' : 'source-over'; MKG.drawImage(o.img, o.x, o.y); } MKG.globalCompositeOperation = 'source-over';
      GLG.globalCompositeOperation = 'destination-out'; GLG.drawImage(MKC, 0, 0); GLG.globalCompositeOperation = 'source-over'; }
    sc.drawImage(GLC, 0, 0); }
  function glow(g, l, a) {   // weicher, runder Lichtschein (radialer Verlauf), Kern bleibt scharf
    const c = l.c || '#ffd56a', [r0, g0, b0] = hx(c), cx = l.x + l.w / 2, cy = l.y + l.h / 2, rx = l.w / 2 + 4 + Math.min(4, l.w * .3), ry = l.h / 2 + 4 + Math.min(4, l.h * .3);
    if (!isFinite(cx + cy + rx + ry) || rx <= 0) return; g.save(); g.translate(cx, cy); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, `rgba(${r0},${g0},${b0},${.34 * a})`); gr.addColorStop(.45, `rgba(${r0},${g0},${b0},${.14 * a})`); gr.addColorStop(1, `rgba(${r0},${g0},${b0},0)`);
    g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
    g.globalAlpha = a;
    if (l.soft) { /* nur der Schein, kein farbiger Kern (Düsenflammen zeichnen sich selbst) */ }
    else if (l.w >= 4 && l.h >= 4) { for (let y = 0; y < l.h; y++) { const t = (y + .5) / l.h * 2 - 1, hw = Math.round(l.w / 2 * Math.sqrt(1 - t * t)); R(g, Math.round(cx - hw), l.y + y, hw * 2, 1, c); } }   // runder Kern bei großen Lichtern
    else R(g, l.x, l.y, l.w, l.h, c);
    g.globalAlpha = 1; }

  // ---------- Welt (fest, deterministisch) ----------
  const rnd = rng(7);
  const farH = [], nearH = [], hillH = [];
  for (let x = 0; x < W; x++) {
    farH[x] = Math.round(70 + 9 * Math.sin(x * .024 + 1) + 6 * Math.sin(x * .061 + 2.3) + 2 * Math.sin(x * .19));
    nearH[x] = Math.round(92 + 6 * Math.sin(x * .037 + 4) + 3 * Math.sin(x * .1 + 1) + 1.2 * Math.sin(x * .3));
  }
  // Hang für das Kraftwerk (rechts), weich, unter dem Gebäude geebnet
  const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const HILL0 = 293, HILL1 = 323, HILLH = 26, STAIR0 = 295;
  for (let x = 0; x < W; x++) hillH[x] = Math.round(G - HILLH * smooth((x - HILL0) / (HILL1 - HILL0)));
  // zwei Waldreihen wie in „Cast n Chill“: hinten bläulich, vorne warm mit Herbstbäumen
  const forestFar = [], forestNear = [];
  for (let x = -6; x < W + 6; x += 3 + Math.floor(rnd() * 3)) forestFar.push({ x, h: 9 + Math.floor(rnd() * 9) });
  for (let x = -8; x < W + 8; x += 4 + Math.floor(rnd() * 5)) forestNear.push({ x, h: 13 + Math.floor(rnd() * 13), a: rnd() < .22 ? (rnd() < .5 ? 1 : 2) : 0, round: rnd() < .45 });
  const stars = Array.from({ length: 60 }, () => ({ x: Math.floor(rnd() * W), y: Math.floor(rnd() * 70), p: rnd() * 6 }));
  const clouds = Array.from({ length: 6 }, () => { const w = 20 + Math.floor(rnd() * 26), n = 2 + Math.floor(w / 12), bumps = []; for (let j = 0; j < n; j++) bumps.push({ dx: Math.round(4 + (j + .5) / n * (w - 8) + (rnd() - .5) * 3), r: 2 + Math.floor(rnd() * 3) + (j === Math.floor(n / 2) ? 1 : 0) }); return { x: rnd() * W, y: 14 + Math.floor(rnd() * 30), v: 1 + rnd() * 1.6, w, bumps }; });
  const sparkles = Array.from({ length: 30 }, () => ({ x: Math.floor(rnd() * W), y: WATER + 3 + Math.floor(rnd() * (H - WATER - 4)), l: 2 + Math.floor(rnd() * 5), p: rnd() * 7 }));
  const flies = Array.from({ length: 14 }, () => ({ x: rnd() * W, p: rnd() * 7, s: .4 + rnd() * .6 }));
  const birds = Array.from({ length: 4 }, (_, i) => ({ x: rnd() * W, y: 30 + rnd() * 30, v: 6 + rnd() * 6, p: rnd() * 6 }));
  const tufts = Array.from({ length: 90 }, () => ({ x: Math.floor(rnd() * W), d: Math.floor(rnd() * 4), f: rnd() < .25 ? ['#f2e27a', '#f29ab8', '#ffffff', '#c9a0ff'][Math.floor(rnd() * 4)] : null }));

  // Himmel, Berge, Tannen-Silhouette (wie in „Stilles Ufer“)
  function backdrop(sc, k, hz, time, t) {
    const n = k.night;
    const band = y => Math.floor(y / hz * 13), bc = bi => rgb(mix(k.top, k.bot, Math.min(1, bi / 11)));
    sc.drawImage(cachedLayer('sky' + hz, hz, kq(k.top, k.bot), sc => { for (let y = 0; y < hz; y++) { const bi = band(y); R(sc, 0, y, W, 1, bc(bi)); if (band(y + 1) > bi && bi < 11) { sc.fillStyle = bc(bi + 1); for (let x = y % 2; x < W; x += 2) sc.fillRect(x, y, 1, 1); } } }), 0, 0);   /* Himmelsverlauf aus dem Zwischenbild */
    if (n > .05) { for (const s of stars) { const a = n * (.45 + .55 * Math.sin(time * 1.7 + s.p * 3)); if (a > 0) { sc.globalAlpha = a; R(sc, s.x, s.y, 1, 1, '#fdf6e0'); } } sc.globalAlpha = 1; }
    let sunPos = null, moonPos = null;
    if (t > .15 && t < .82) {
      const p = (t - .15) / .67, sx = 16 + p * (W - 32), sy = 96 - Math.sin(p * Math.PI) * 74, low = 1 - Math.sin(p * Math.PI);
      const c = mix(hx('#fff4c8'), hx('#ff9a50'), Math.min(1, low * 1.3)), cs = rgb(c);
      sc.globalAlpha = .2; disc(sc, sx, sy, 11, cs); sc.globalAlpha = .35; disc(sc, sx, sy, 8, cs); sc.globalAlpha = 1; disc(sc, sx, sy, 5, cs);
      sunPos = { x: sx, c };
    }
    const tt = t < .5 ? t + 1 : t;
    if (tt > .8 && tt < 1.2) {
      const p = (tt - .8) / .4, mx = 24 + p * (W - 48), my = 92 - Math.sin(p * Math.PI) * 70;
      sc.globalAlpha = Math.min(1, n * 1.3); disc(sc, mx, my, 4, '#eef0ff'); sc.globalAlpha = 1;
      disc(sc, mx + 2, my - 1, 3, rgb(mix(k.top, k.bot, Math.min(1, Math.floor(my / hz * 13) / 11))));
      moonPos = { x: mx };
    }
    {   // ganz selten: Flugzeug weit weg, fliegt von rechts nach links, mit Kondensstreifen
      const ph = (time + 170) % 260; if (ph < 70 && selten('flieger', Math.floor((time + 170) / 260), .2)) {   /* v156: nur alle paar Spieltage */ const x = Math.round(W + 12 - ph / 70 * (W + 90)), y = 30; if (window.SFX) SFX.hum('plane', .3 * Math.sin(ph / 70 * Math.PI) * (hz === G + 2 ? 1 : .4), SFX.panX(x)); const pc = rgb(mix(hx('#d8d2cc'), k.top, .25 + n * .5)), pd = rgb(mix(hx('#8f8a92'), k.top, .3 + n * .4));
        for (let i = 0; i < 46; i++) { sc.globalAlpha = (1 - i / 46) * .45 * (1 - n * .7); R(sc, x + 9 + i, y + (i > 30 ? (i % 3 ? 0 : 1) : 0), 1, 1, '#ffffff'); } sc.globalAlpha = 1;
        R(sc, x, y, 9, 1, pc); R(sc, x + 1, y + 1, 7, 1, pd); R(sc, x + 7, y - 2, 1, 2, pc); R(sc, x + 8, y - 3, 1, 3, pc); R(sc, x + 3, y + 2, 3, 1, pd);
        if (n > .3 && Math.floor(time * 2) % 2) { R(sc, x + 4, y + 2, 1, 1, '#ff5a4a'); R(sc, x + 8, y - 3, 1, 1, '#ffffff'); } }
    }
    const cc = rgb(k.cloud), cs = rgb(mix(k.cloud, k.top, .32)), cs2 = rgb(mix(k.cloud, k.top, .55)), chl = rgb(mix(k.cloud, hx('#ffffff'), .55 * (1 - n)));
    sc.globalAlpha = .95;
    for (const c of clouds) {   // flache Haufenwolken: breiter Körper mit glatter Unterseite, oben ein paar kleine Quellungen
      const x = Math.round(((c.x + time * c.v) % (W + 80)) - 40), b = c.y, w = c.w;
      for (const p of c.bumps) for (let yy = -p.r; yy <= 0; yy++) { const hw = Math.round(Math.sqrt(p.r * p.r - yy * yy) * 1.4); R(sc, x + p.dx - hw, b - 3 + yy, 2 * hw + 1, 1, yy === -p.r ? chl : cc); }
      R(sc, x + 1, b - 3, w - 2, 1, cc); R(sc, x, b - 2, w, 1, cc); R(sc, x, b - 1, w, 1, cs); R(sc, x + 2, b, w - 4, 1, cs2);
    }
    sc.globalAlpha = 1;
    sc.drawImage(cachedLayer('land' + hz, hz + 2, kq(k.far, k.bot, k.near, k.tree, k.top, n), sc => {   /* Berge, Dunst und Wald: ändern sich nur mit den Tagesfarben */
    const fA = mix(k.far, k.bot, .42), faB = rgb(fA), faL = rgb(mix(fA, k.bot, .25)), fsn = rgb(mix(fA, hx('#ffffff'), .25)), nA = mix(k.near, k.bot, .2), neB = rgb(nA), neL = rgb(mix(nA, k.bot, .18)), ne3 = rgb(mix(nA, k.bot, .3));
    const sl = (a, x) => a[Math.min(W - 1, x + 2)] - a[Math.max(0, x - 2)];
    for (let x = 0; x < W; x++) { R(sc, x, farH[x], 1, hz - farH[x], faB); if (sl(farH, x) < 0) R(sc, x, farH[x], 1, 6, faL); if (farH[x] < 62) R(sc, x, farH[x], 1, 2, fsn); }
    for (let i = 0; i < 6; i++) { sc.globalAlpha = .07 * (i + 1); R(sc, 0, hz - 34 + i * 4, W, 4, rgb(k.bot)); } sc.globalAlpha = 1;
    for (let x = 0; x < W; x++) { R(sc, x, nearH[x], 1, hz - nearH[x], neB); if (sl(nearH, x) < 0) R(sc, x, nearH[x], 1, 3, neL); R(sc, x, nearH[x], 1, 1, ne3); }
    for (let i = 0; i < 4; i++) { sc.globalAlpha = .06 * (i + 1); R(sc, 0, hz - 16 + i * 3, W, 3, rgb(k.bot)); } sc.globalAlpha = 1;
    const tree = (tr, base, cBody, cLight) => { const tp = base - tr.h; for (let i = 0; i < tr.h; i++) { const w = Math.floor(i * .36) + (i % 3 === 2 ? 1 : 0); R(sc, tr.x - w, tp + i, 2 * w + 1, 1, cBody); if (w > 0) R(sc, tr.x - w, tp + i, 1, 1, cLight); } R(sc, tr.x, base - 1, 1, 2, cBody); };
    const fB = rgb(mix(k.near, k.tree, .45)), fL = rgb(mix(mix(k.near, k.tree, .45), k.bot, .25));
    for (const tr of forestFar) tree(tr, hz - 3, fB, fL);
    for (let i = 0; i < 3; i++) { sc.globalAlpha = .08 * (i + 1); R(sc, 0, hz - 10 + i * 3, W, 3, rgb(k.bot)); } sc.globalAlpha = 1;
    const aut = [mix(hx('#9a5a22'), k.tree, .35 + n * .5), mix(hx('#b8862e'), k.tree, .35 + n * .5)];
    const roundT = (tr, base, cBody, cLight, cDark) => { const r = Math.max(4, Math.round(tr.h / 3.2)), cy = base - r - 3; disc(sc, tr.x, cy + 1, r, cDark); disc(sc, tr.x - 1, cy, r - 1, cBody); disc(sc, tr.x - 2, cy - 2, Math.max(1, r - 3), cLight); disc(sc, tr.x + r - 2, cy + 1, Math.max(1, r - 3), cBody); R(sc, tr.x, base - 4, 1, 5, cDark); };
    for (const tr of forestNear) { const c = tr.a ? aut[tr.a - 1] : k.tree; if (tr.round) roundT(tr, hz + 1, rgb(c), rgb(mix(c, k.bot, .22)), rgb(mix(c, k.top, .25))); else tree(tr, hz + 1, rgb(c), rgb(mix(c, k.bot, .22))); }
    R(sc, 0, hz - 2, W, 3, rgb(k.tree));
    }), 0, 0);
    // Vögel
    if (n < .6) for (const b of birds) { const x = ((b.x + time * b.v) % (W + 20)) - 10, y = b.y + Math.sin(time * .7 + b.p) * 4, up = Math.sin(time * 9 + b.p) > 0; sc.fillStyle = rgb(mix(hx('#3e2731'), k.bot, .3)); if (up) { R(sc, x - 2, y - 1, 1, 1, sc.fillStyle); R(sc, x + 2, y - 1, 1, 1, sc.fillStyle); } R(sc, x - 1, y, 1, 1, sc.fillStyle); R(sc, x + 1, y, 1, 1, sc.fillStyle); R(sc, x, y + (up ? 0 : 1), 1, 1, sc.fillStyle); }
    return { sunPos, moonPos };
  }

  // Werkshof-Boden: Hügel hinten, Gehweg vor den Gebäuden, Kopfsteinpflaster, Fahrweg, Grünstreifen, Kaimauer
  const lawn = Array.from({ length: 520 }, () => ({ x: Math.floor(rnd() * W), y: UP + 2 + Math.floor(rnd() * (PROM - UP - 3)), t: Math.floor(rnd() * 3), f: rnd() < .22 ? ['#f2e27a', '#f29ab8', '#ffffff', '#c9a0ff', '#ffb070', '#ffffff'][Math.floor(rnd() * 6)] : null }));
  const clover = Array.from({ length: 44 }, () => ({ x: Math.floor(rnd() * W), y: UP + 3 + Math.floor(rnd() * (PROM - UP - 5)), w: 6 + Math.floor(rnd() * 10) }));
  const joints = Array.from({ length: 30 }, () => ({ x: Math.floor(rnd() * YARD_X), y: UP + 2 + Math.floor(rnd() * (VERGE - UP - 3)) }));
  // Wege: Kreisel in der Mitte (Insel mit Statue) verbindet den oberen Weg mit der Promenade, Gartenweg rechts zum Steg
  const RX = 31, RY = 13, RXI = 24, RYI = 8;
  function pathRows(y) {
    const out = [];
    if (y < UP || y >= PROM) return out;
    const dy = y - RCY;
    if (Math.abs(dy) <= RY) {
      const ow = Math.round(RX * Math.sqrt(1 - dy * dy / (RY * RY)));
      if (Math.abs(dy) < RYI) { const iw = Math.round(RXI * Math.sqrt(1 - dy * dy / (RYI * RYI))); out.push([FORKX - ow, ow - iw], [FORKX + iw, ow - iw]); }
      else out.push([FORKX - ow, 2 * ow]);
    }
    if (y > RCY + RY - 4) { const t = (y - (RCY + RY - 4)) / (PROM - (RCY + RY - 4)), w = Math.round(12 + t * t * 18); out.push([FORKX - Math.floor(w / 2), w]); }   // Auslauf zur Promenade
    const q = (y - UP) / (PROM - UP), e2 = q * q * (3 - 2 * q), gx = Math.round(318 + 24 * e2 + 9 * Math.sin(q * Math.PI) * (1 - q * .4)), fl = [5, 3, 2, 1, 1][y - UP] || 0; out.push([gx - fl, 7 + fl]);   // Ausrundung an der Einmündung
    return out;
  }
  // der obere Weg schwingt zwischen den Gebäuden leicht nach vorn
  const bump = (x, c, r) => Math.abs(x - c) < r ? Math.cos((x - c) / r * Math.PI / 2) ** 2 : 0;
  const pathDip = x => Math.round(2 * bump(x, 132, 18));
  const inBay = (x, y) => y >= UP - 1 && y < BAY[2] + 1 && x >= BAY[0] - 1 && x < BAY[1] + 1;
  const onPath = (x, y) => inBay(x, y) || (y >= RCY - RYI && y <= RCY + RYI && ((x - FORKX) / RXI) ** 2 + ((y - RCY) / RYI) ** 2 < 1.3) || (y >= UP && y < PROM && pathRows(y).some(([x0, w]) => x >= x0 - 2 && x < x0 + w + 2));
  const POND = { x: 352, y: 125, rx: 15, ry: 4 }, BEDS = [{ x: 292, y: 127, w: 14 }, { x: 370, y: 140, w: 14 }, { x: 128, y: 128, w: 12 }, { x: 52, y: 146, w: 14 }];   // Blumenbeete
  function ground(sc, k, behindStairs) {
    const nk = k.night;
    const top = rgb(mix(k.grass, k.bot, .2)), body = rgb(mix(k.grass, k.tree, .22)), deep = rgb(mix(k.grass, k.tree, .45));
    for (let x = 0; x < W; x++) {
      const t = hillH[x];
      R(sc, x, t, 1, G + 2 - t, body); R(sc, x, t, 1, 1, top); if (x % 3 === 0) R(sc, x, t - 1, 1, 1, top);
      if (t < G) { R(sc, x, t + 3, 1, 1, (x % 2) ? deep : body); R(sc, x, t + 4, 1, G - t - 2, deep); }
    }
    const rockC = rgb(mix(hx('#8f8a92'), k.tree, .3 + nk * .4)), rockD = rgb(mix(hx('#4a4652'), k.tree, .3 + nk * .3));
    const grassD = rgb(mix(k.grass, k.tree, .6)), grassL = rgb(mix(k.grass, k.bot, .1));
    for (let x = HILL0 + 6; x < W; x++) { const t = hillH[x]; if (t > G - 6) continue; const r1 = t + 6 + Math.round(Math.sin(x * .4) * 1.5); for (let y = t + 5; y < G; y += 3) if ((x * 7 + y * 3) % 11 === 0) R(sc, x, y, 1, 2, grassD); if ((x * 5) % 9 === 0) R(sc, x, t - 1, 1, 1, grassL); }
    {   // einzelne Felsbrocken, halb im Gras versunken, mit Grasbüscheln davor
      const rockL = rgb(mix(hx('#b5afb0'), k.tree, .25 + nk * .45));
      for (const [x, dy, rx, ry] of [[331, 7, 5, 3], [338, 8, 3, 2], [356, 7, 4, 3], [376, 9, 6, 4], [383, 8, 3, 2]]) { const cy = hillH[x] + dy;
        for (let yy = -ry; yy <= 0; yy++) { const hw = Math.round(rx * Math.sqrt(1 - (yy / (ry + .5)) ** 2)); R(sc, x - hw, cy + yy, 2 * hw + 1, 1, rockC); R(sc, x + hw - 1, cy + yy, 2, 1, rockD); if (yy < 0) R(sc, x - hw + 1, cy + yy, Math.max(1, hw - 1), 1, yy === -ry ? rockL : rockC); }
        R(sc, x - rx, cy + 1, 2 * rx + 1, 1, deep); for (let i = -rx; i <= rx; i += 2) R(sc, x + i, cy - (i % 4 ? 0 : 1), 1, 2, grassD); }
    }
    const stepC = rgb(mix(hx('#d8d2cc'), k.tree, .2 + nk * .45)), riseC = rgb(mix(hx('#8f8a92'), k.tree, .25 + nk * .4)), rail = rgb(mix(hx('#3e2731'), k.tree, .2 + nk * .3));
    if (behindStairs) behindStairs(sc);   // z. B. die Tanne: hinter Treppe und Geländer
    let prev = G;
    for (let x = STAIR0; x < HILL1 + 1; x += 3) { const tp = Math.min(prev, hillH[Math.min(W - 1, x + 3)] + 1); R(sc, x, tp, 4, Math.min(5, G + 1 - tp), riseC); R(sc, x, tp, 4, 1, stepC); R(sc, x, tp + Math.min(5, G + 1 - tp), 4, 1, rockD); R(sc, x, tp - 7, 1, 7, rail); prev = tp; }
    for (let x = STAIR0; x < HILL1 + 1; x++) R(sc, x, Math.min(G, hillH[Math.min(W - 1, x + 2)]) - 7, 1, 1, rail);
    {   // oberste Stufe: schließt bündig an den grauen Sockel des Kraftwerks an (der Sockel ist der Tritt vor der Tür)
      const pt = hillH[354] - 2, xl = HILL1 - 4, xr = 326;
      R(sc, xl, pt, xr - xl, 5, riseC); R(sc, xl, pt, xr - xl, 1, stepC); R(sc, xl, pt + 5, xr - xl, 1, rockD);
      for (let x = xl; x < xl + 3; x++) R(sc, x, pt - 7, 1, 1, rail); R(sc, xl, pt - 7, 1, 7, rail);
    }
    // Wiese vom oberen Weg bis zur Uferpromenade
    const lg = mix(k.grass, k.bot, .12), lgD = mix(k.grass, k.tree, .26);
    for (let y = G; y < PROM; y++) R(sc, 0, y, W, 1, rgb(mix(lgD, lg, (y - G) / (PROM - G))));
    const pv = mix(hx('#dccba8'), k.tree, .12 + nk * .45), pvC = rgb(pv), pvL = rgb(mix(pv, hx('#fff6e0'), .3)), pvD = rgb(mix(pv, hx('#5c3a2e'), .2)), edge = rgb(mix(k.grass, k.tree, .55)), pE = rgb(mix(pv, hx('#3e2731'), .45));
    const mossC = rgb(mix(k.grass, k.tree, .35)), mossL = rgb(mix(k.grass, k.bot, .15));
    // oberer Weg: breit genug für den Lieferwagen, mit Haltebucht vor dem Pförtnerhaus
    for (let x = 0; x < PATH_END; x++) { const d = pathDip(x), rc = x >= PATH_END - 6 ? 6 - Math.round(Math.sqrt(36 - (x - (PATH_END - 6)) ** 2)) : 0;   // Ende oben rechts abgerundet
      if (rc) { R(sc, x, G + rc, 1, 7 - rc, pvC); R(sc, x, G + rc - 1, 1, 1, pE); R(sc, x, G + 7, 1, 1, pE); continue; }
      R(sc, x, G + d, 1, 7, pvC); R(sc, x, G + d, 1, 1, d ? pvL : rgb(mix(pv, hx('#3e2731'), .18))); if (d) R(sc, x, G + d - 1, 1, 1, pE); R(sc, x, G + d + 7, 1, 1, pE); if (x % 8 === 0) { R(sc, x, G + d + 1, 1, 2, pvD); } if ((x + 4) % 8 === 0) R(sc, x, G + d + 4, 1, 3, pvD); }
    R(sc, 0, G + 3, PATH_END - 6, 1, pvD); R(sc, PATH_END, G + 6, 1, 1, pE);
    for (let y = G + 7; y < BAY[2]; y++) { const i = Math.max(0, y - BAY[2] + 4), x0 = BAY[0] + i, x1 = BAY[1] - i, r = (y - G) % 7;   // Haltebucht im gleichen Plattenmuster wie der Weg
      R(sc, x0 - 1, y, x1 - x0 + 2, 1, pE); R(sc, x0, y, x1 - x0, 1, r === 3 ? pvD : pvC); for (let x = x0; x < x1; x++) if ((r === 1 || r === 2) ? x % 8 === 0 : (r > 3 && (x + 4) % 8 === 0)) R(sc, x, y, 1, 1, pvD); }
    for (let x = BAY[0]; x < BAY[1]; x++) R(sc, x, G + 7, 1, 1, pvC);
    // Kreisel und Gartenweg
    for (let y = UP; y < PROM; y++) for (const [x0, w] of pathRows(y)) { R(sc, x0 - 1, y, w + 2, 1, pE); R(sc, x0, y, w, 1, pvC); if ((y + x0) % 4 === 0) R(sc, x0 + 2, y, 2, 1, pvD); }
    {   // kleiner Teich: Uferrand aus Steinen, Wasser mit Spiegelung, Seerose, Schilf
      const { x: cx, y: cy, rx, ry } = POND, wc = k.water, edgeS = rgb(mix(hx('#8f8a92'), k.tree, .3 + nk * .4)), edgeD = rgb(mix(hx('#4a4652'), k.tree, .3 + nk * .4));
      for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 2; x <= rx + 2; x++) { const d = (x / (rx + 1.5)) ** 2 + (y / (ry + 1)) ** 2; if (d > 1) continue; R(sc, cx + x, cy + y, 1, 1, d > .72 ? ((x + y) % 3 ? edgeS : edgeD) : rgb(mix(wc, hx('#000820'), .12 + (y + ry) / (2 * ry) * .15))); }
      R(sc, cx - 4, cy + 1, 5, 2, rgb(mix(k.grass, k.tree, .3))); R(sc, cx - 3, cy + 1, 1, 1, '#f2a8c0');
      for (const [x, h] of [[cx + rx - 1, 6], [cx + rx + 1, 4], [cx - rx, 5]]) { R(sc, x, cy - h, 1, h, rgb(mix(k.grass, k.tree, .4))); R(sc, x, cy - h, 1, 2, rgb(mix(hx('#7f5236'), k.tree, .2 + nk * .3))); }
    }
    // Insel im Kreisel: Rasen mit Blumenring
    for (let y = RCY - RYI + 1; y < RCY + RYI; y++) { const dy = y - RCY, iw = Math.round((RXI - 1) * Math.sqrt(Math.max(0, 1 - dy * dy / (RYI * RYI)))); R(sc, FORKX - iw, y, 2 * iw, 1, rgb(mix(k.grass, k.bot, .1 + (y - RCY + RYI) / 40))); }
    for (let a = 0; a < Math.PI * 2; a += .26) { const fx = FORKX + Math.cos(a) * (RXI - 4), fy = RCY + Math.sin(a) * (RYI - 2.5); sc.globalAlpha = Math.max(.35, 1 - nk * 1.1); R(sc, fx, fy, 1, 1, ['#f29ab8', '#f2e27a', '#ffffff', '#ff8a6a'][Math.round(a * 4) % 4]); R(sc, fx + 1, fy + 1, 1, 1, edge); sc.globalAlpha = 1; }
    // Blumenbeete mit Steinkante
    const soil = rgb(mix(hx('#5c3a2e'), k.tree, .25 + nk * .3)), stoneE = rgb(mix(hx('#b5afb0'), k.tree, .25 + nk * .45)), bf = ['#f29ab8', '#f2e27a', '#ffffff', '#c9a0ff', '#ff8a6a'];
    for (const b of BEDS) { for (let j = 0; j < 5; j++) { const w = b.w - Math.abs(2 - j) * 2; R(sc, b.x - w / 2, b.y + j, w, 1, j === 4 ? stoneE : soil); } for (let i = 0; i < b.w - 4; i += 2) { const fx = b.x - b.w / 2 + 2 + i; R(sc, fx, b.y + (i % 4 ? 1 : 0), 1, 2, edge); sc.globalAlpha = Math.max(.35, 1 - nk * 1.1); R(sc, fx, b.y - 1 + (i % 4 ? 1 : 0), 1, 1, bf[(i + b.x) % 5]); sc.globalAlpha = 1; } }
    // Uferpromenade: links mit Abschluss und Geländer, rechts bis zum Wasserrad
    const P0 = PROM_X[0], P1 = PROM_X[1];
    R(sc, 0, PROM, P0, WATER - 5 - PROM, rgb(lg));                                                               // links Wiese bis ans Ufer
    R(sc, P0, PROM, P1 - P0, WATER - 5 - PROM, pvC); R(sc, P0, PROM, P1 - P0, 1, pvL); R(sc, P0, PROM + 3, P1 - P0, 1, pvD);
    for (let x = P0; x < P1; x += 8) { const o = ((x / 8) % 2) * 4; R(sc, x, PROM + 1, 1, 2, pvD); R(sc, x + o, PROM + 4, 1, 3, pvD); }
    R(sc, P0 - 1, PROM, 1, WATER - 5 - PROM, pE); R(sc, P1, PROM, 1, WATER - 5 - PROM, pE);
    sc.globalAlpha = .25; R(sc, P0, PROM, P1 - P0, 1, edge); sc.globalAlpha = 1;
    const post = rgb(mix(hx('#5c3a2e'), k.tree, .2 + nk * .4)), postL = rgb(mix(hx('#a5703f'), k.tree, .2 + nk * .4));
    for (const x of [P0 + 1, P0 + 5]) { R(sc, x, PROM - 2, 2, 8, post); R(sc, x, PROM - 2, 1, 7, postL); } R(sc, P0 + 1, PROM, 7, 1, postL); R(sc, P0 + 1, PROM + 3, 7, 1, post);   // Abgrenzung links
    const gT = [rgb(mix(k.grass, k.tree, .55)), rgb(mix(k.grass, k.tree, .35)), rgb(mix(k.grass, k.bot, .25))], clv = rgb(mix(k.grass, k.tree, .2)), fl = Math.max(.3, 1 - nk * 1.15);
    for (const c of clover) { if (c.y >= PROM - 1 || c.y < UP + 2 || onPath(c.x, c.y) || onPath(c.x + c.w, c.y) || BEDS.some(b => Math.abs(c.x - b.x) < b.w && Math.abs(c.y - b.y) < 6)) continue; R(sc, c.x, c.y, c.w, 2, clv); R(sc, c.x + 1, c.y - 1, c.w - 2, 1, clv); }
    for (const v of lawn) { if (v.y >= PROM - 1 || v.y < UP + 2 || onPath(v.x, v.y) || BEDS.some(b => Math.abs(v.x - b.x) < b.w / 2 + 1 && v.y > b.y - 2 && v.y < b.y + 6)) continue; const c = gT[v.t]; R(sc, v.x, v.y, 1, 2, c); R(sc, v.x - 1, v.y, 1, 1, c); R(sc, v.x + 1, v.y - 1, 1, 2, gT[Math.min(2, v.t + 1)]);
      if (v.f) { sc.globalAlpha = fl; R(sc, v.x, v.y - 2, 1, 1, v.f); if (v.t === 2) { R(sc, v.x - 1, v.y - 1, 1, 1, v.f); R(sc, v.x + 1, v.y - 1, 1, 1, v.f); R(sc, v.x, v.y - 1, 1, 1, '#f7d86a'); } sc.globalAlpha = 1; } }
    // Kaimauer
    const quay = rgb(mix(hx('#8f8a92'), k.tree, .3 + nk * .4)), quayL = rgb(mix(hx('#b5afb0'), k.tree, .25 + nk * .4)), quayD = rgb(mix(hx('#6b6672'), k.tree, .3 + nk * .4));
    R(sc, 0, WATER - 5, W, 5, quay); R(sc, 0, WATER - 5, W, 1, quayL); R(sc, 0, WATER - 3, W, 1, quayD);
    for (let x = 0; x < W; x += 9) { R(sc, x, WATER - 4, 1, 1, quayD); R(sc, x + 4, WATER - 2, 1, 2, quayD); R(sc, x + 1, WATER - 4, 3, 1, rgb(mix(hx('#b5afb0'), k.tree, .3 + nk * .4))); }
    for (let x = 0; x < W; x += 3) if ((x * 13) % 7 < 3) R(sc, x, WATER - 6, 2, 1, mossC);
    R(sc, 0, WATER - 1, W, 1, rgb(mix(k.shore, k.tree, .5)));
  }

  // Wasser mit zeilenweiser Spiegelung, Glitzern und Sonnen-/Mondpfad
  function water(ctx, scene, k, time, sunPos, moonPos) {
    const wc = k.water;
    R(ctx, 0, WATER, W, H - WATER, rgb(wc));
    ctx.globalAlpha = .75;
    for (let y = WATER; y < H; y++) { const d = y - WATER, src = WATER - 1 - d; if (src < 0) break; const dx = Math.round(Math.sin(y * 1.3 - time * .7 + Math.sin(y * .23) * 2) * (.6 + d / 90));   /* Fließgewässer: ruhige, gestreckte Spiegelung */ ctx.drawImage(scene, 0, src, W, 1, dx, y, W, 1); }
    ctx.globalAlpha = .38; R(ctx, 0, WATER, W, H - WATER, rgb(wc));
    ctx.globalAlpha = .25; R(ctx, 0, WATER + 28, W, H - WATER - 28, rgb(mix(wc, hx('#000820'), .5)));
    const spc = rgb(mix(k.bot, hx('#ffffff'), .6));
    for (const s of sparkles) { const a = Math.sin(time * 1.3 + s.p) * .5; if (a > 0) { ctx.globalAlpha = a; R(ctx, ((s.x + time * (2.6 + (s.y - WATER) * .08)) % (W + 10)) - 5, s.y, s.l, 1, spc); } }
    for (let i = 0; i < 14; i++) { const y = WATER + 4 + (i * 7) % (H - WATER - 6), sp = 3.3 + (y - WATER) * .1, x = ((i * 53 + time * sp) % (W + 40)) - 20; ctx.globalAlpha = .16; R(ctx, x, y, 9 + (i % 3) * 4, 1, spc); ctx.globalAlpha = .08; R(ctx, x - 6, y, 5, 1, spc); }   // Strömung nach rechts
    const gp = sunPos || moonPos;
    if (gp) { const gc = sunPos ? rgb(mix(sunPos.c, hx('#ffffff'), .3)) : '#dfe4ff'; for (let j = 0; j < 11; j++) { const y = WATER + 2 + j * 6, w = 3 + Math.round((Math.sin(time * 2 + j * 1.7) + 1) * 2) + j; ctx.globalAlpha = (sunPos ? .55 : .35 * k.night) * (1 - j / 13) * (.6 + .4 * Math.sin(time * 3 + j)); R(ctx, gp.x - w / 2 + Math.sin(time + j) * 2, y, w, 1, gc); } }
    ctx.globalAlpha = 1;
  }

  // Rauch / Funken
  const parts = [];
  function puff(x, y, kind) { const fall = kind === 'spark' || kind === 'drop' || kind === 'chip'; parts.push({ x, y, vx: (Math.random() - .5) * (kind === 'drop' ? 8 : 2), vy: fall ? -8 - Math.random() * 6 : -4 - Math.random() * 2, life: fall ? .5 : 3 + Math.random() * 2, max: 4, sz: fall ? 1 : 2 + (Math.random() < .3 ? 1 : 0), kind, c: kind === 'spark' ? (Math.random() < .5 ? '#ffd56a' : '#fff3c0') : kind === 'drop' ? '#c2e2e6' : kind === 'chip' ? (Math.random() < .5 ? '#d8d2cc' : '#a6abb1') : null }); }
  /* v158: Dampfstoß (aus den Mecha-Armen) und Staubwölkchen (Mecha-Schritte): weiche Partikel mit eigener Farbe */
  function dampf(x, y, dir) { for (let i = 0; i < 7; i++) parts.push({ x: x + (Math.random() - .5) * 3, y: y + (Math.random() - .5) * 3, vx: dir * (6 + Math.random() * 8) + (Math.random() - .5) * 4, vy: -6 - Math.random() * 7, life: .7 + Math.random() * .6, max: 1.3, sz: Math.random() < .4 ? 3 : 2, kind: 'dampf', soft: .8, c: Math.random() < .5 ? '#fffaf0' : '#e6e1da' }); }
  function staub(x, y, dir) { for (let i = 0; i < 6; i++) parts.push({ x: x + dir * Math.random() * 3, y: y - Math.random() * 2, vx: dir * (5 + Math.random() * 9), vy: -1.5 - Math.random() * 2.5, life: .45 + Math.random() * .35, max: .8, sz: Math.random() < .5 ? 2 : 1, kind: 'staub', soft: .8, c: Math.random() < .5 ? '#d9cbb3' : '#a6abb1' }); }
  function stepParts(dt) { for (const p of parts) { p.life -= dt; p.x += p.vx * dt + (p.kind === 'smoke' ? Math.sin(p.life * 2) * .1 : 0); p.y += p.vy * dt; if (p.kind === 'spark' || p.kind === 'drop' || p.kind === 'chip') p.vy += 30 * dt; } for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1); }

  /* KATZE-KERN v157: Katzenroboter, mit pxl entworfen (tools/katze/katze.px.js) und hier 1:1 nachgebaut.
     Posen als Skelett (Hüfte, Brust, Kopf, Pfoten, Schwanzkurve), gezeichnet in Schlüssel-Zeilen mit Umriss g.
     katzeAnims(S) -> { name: { fps, loop, f: [{ rows, eye }] } }, S=1 groß (Hallen), S=.6 klein (Werkshof) */
  const katzeAnims = (() => {
    const L = (a, b, t) => a + (b - a) * t, LP = (a, b, t) => [L(a[0], b[0], t), L(a[1], b[1], t)], ease = t => t * t * (3 - 2 * t);
    function mix(a, b, t) { const o = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const x = a[k] === undefined ? b[k] : a[k], y = b[k] === undefined ? x : b[k];
        if (typeof x === 'number') o[k] = L(x, y, t);
        else if (Array.isArray(x) && Array.isArray(y) && typeof x[0] === 'number') o[k] = LP(x, y, t);
        else if (!Array.isArray(x) || !Array.isArray(y)) o[k] = t < .5 ? x : y;
        else o[k] = x.map((p, i) => p && y[i] ? LP(p, y[i], t) : (t < .5 ? p : y[i])); }
      return o; }
    const STAND = { hip: [8, 9], chest: [17, 9], rh: 2.9, rc: 3, haunch: 0, hx: 9, hy: 12, head: [22.5, 5], neck: [19, 7.5], tilt: 0, eye: 'auf', ears: 0,
      tail: [[6, 8.5], [2, 7], [2.5, 1.5]], nhF: [8.5, 18], fhF: [7, 18], nfF: [17.5, 18], ffF: [16, 18], stripe: 1 };
    const SIT = { ...STAND, hip: [9, 13.5], chest: [14.5, 8], rh: 3.6, rc: 3, haunch: 4, hx: 9, hy: 14.5, head: [17, 4], neck: [15.5, 6], tail: [[6, 16.5], [9, 19.5], [14, 17]],
      nhF: [12, 18], fhF: [10.5, 18], nfF: [15.5, 18], ffF: [14, 18], stripe: 0 };
    const LIE = { ...SIT, hip: [9, 14.5], chest: [17, 14], rh: 3.4, rc: 3.1, haunch: 3.5, hx: 9, hy: 15, head: [21.5, 11.5], neck: [19.5, 13], tail: [[5.5, 15.5], [6, 19.5], [13, 18]],
      nhF: [12, 18], fhF: [11, 18], nfF: [22, 18], ffF: [20.5, 18], stripe: 1 };
    const CURL = { ...LIE, hip: [11, 14], chest: [15, 14.8], rh: 4.2, rc: 3.4, haunch: 4.6, hx: 11, hy: 13.6, head: [18.6, 15.2], neck: [17, 15], tilt: .6, eye: 'zu', ears: 1,
      tail: [[7, 17.4], [13, 20.6], [21.6, 17.6]], tailFront: 1, nhF: null, fhF: null, nfF: null, ffF: null, stripe: 1 };
    const STRETCH = { ...STAND, hip: [8, 8], chest: [16, 12.5], rh: 2.9, rc: 2.6, head: [21.5, 11], neck: [18.5, 12], tilt: 0, eye: 'zu',
      tail: [[6, 7.5], [2, 3], [5, 0.5]], nhF: [8, 18], fhF: [6.5, 18], nfF: [23.5, 18], ffF: [22, 18] };
    const REAR = { ...SIT, hip: [9.5, 13.5], chest: [12.5, 6.5], rh: 3.4, rc: 2.8, haunch: 3.6, head: [15, 2.5], neck: [13.5, 4.5],
      tail: [[6.5, 16], [2, 17.5], [1, 13]], nhF: [11.5, 18], fhF: [10, 18], nfF: [16, 2], ffF: [17, 4], paws: 1 };
    const UP = { i: 'j', j: 'l', l: 'H', h: 'i', F: 'h' };   /* Stahlschale eine Stufe heller, ferne Beine dunkel */
    function draw(W, H, S, p, extra) {
      const oy = H - 1 - 18 * S, buf = Array.from({ length: H }, () => Array(W).fill(null)), X = v => v * S, Y = v => v * S + oy;
      const set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) buf[y][x] = k; };
      const disc = (cx, cy, r, k) => { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + .2) set(x, y, k); };
      const seg = (a, b, r0, r1, k) => { const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
        for (let i = 0; i <= n; i++) { const t = i / n; if (r0 < .7) set(L(a[0], b[0], t), L(a[1], b[1], t), k); else disc(L(a[0], b[0], t), L(a[1], b[1], t), L(r0, r1, t), k); } };
      const P2 = q => [X(q[0]), Y(q[1])], big = S > .8, lw = big ? .75 : .3;
      const leg = (root, foot, back, k, direkt) => { if (!foot) return;
        if (k === 'i') { const snap = buf.map(r => r.slice()); leg(root, foot, back, 'L', direkt);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y][x] === 'L') { buf[y][x] = 'i'; const lx = x - 1; if (lx >= 0 && snap[y][lx] && buf[y][lx] !== 'L' && snap[y][lx] !== 'g') buf[y][lx] = 'h'; }
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y][x] === 'i' && (y === 0 || !buf[y - 1][x])) buf[y][x] = 'j';
          return; }
        const a = P2(root), f = P2(foot);
        if (direkt) { seg(a, f, lw, lw * .8, k); set(f[0], f[1], 'l'); if (big) set(f[0], f[1] + 1, 'l'); return; }
        const d = Math.hypot(f[0] - a[0], f[1] - a[1]), len = 8.2 * S, h = d < len ? Math.sqrt((len / 2) ** 2 - (d / 2) ** 2) : 0;
        const my = (a[1] + f[1]) / 2 + (f[0] - a[0]) / d * h * (back ? 1 : -.35), mx0 = (a[0] + f[0]) / 2 - (f[1] - a[1]) / d * h * (back ? 1 : -.35);
        const jj = back ? [Math.min(mx0, (a[0] + f[0]) / 2 - h * .9), my] : [(a[0] + f[0]) / 2 - h * .35, my];
        seg(a, jj, lw, lw, k); seg(jj, f, lw, lw * .8, k); set(f[0], f[1], 'g'); if (big) set(f[0] + 1, f[1], 'g'); };
      const rootH = [p.hip[0] + .5, p.hip[1] + p.rh * .55], rootF = [p.chest[0] + .3, p.chest[1] + p.rc * .55];
      leg([rootH[0] - 1.2, rootH[1] - .3], p.fhF, true, 'F');
      leg(p.paws ? [p.chest[0], p.chest[1]] : [rootF[0] - 1.2, rootF[1] - .3], p.ffF, false, 'F', p.paws);
      const drawTail = () => { const [t0, t1, t2] = p.tail;
        for (let i = 0; i <= 26; i++) { const t = i / 26, q = LP(LP(t0, t1, t), LP(t1, t2, t), t), k = t > .9 ? 'Q' : (Math.floor(t * 7) % 2 ? 'h' : 'i'), pp = P2(q);
          if (big && t < .75) disc(pp[0], pp[1], .6, k); else set(pp[0], pp[1], k); } };
      if (!p.tailFront) drawTail();
      if (p.haunch > .3) disc(X(p.hx), Y(p.hy), p.haunch * S, 'i');
      seg(P2(p.hip), P2(p.chest), p.rh * S, p.rc * S, 'i');
      const bf = buf.map(r => r.slice());
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y][x] === 'i' && bf[y][x] === 'i') {
        const up = y > 0 ? bf[y - 1][x] : null, up2 = y > 1 ? bf[y - 2][x] : null, dn = y < H - 1 ? bf[y + 1][x] : null;
        if (up !== 'i') buf[y][x] = 'l'; else if (big && up2 !== 'i') buf[y][x] = 'j'; else if (dn !== 'i' && dn !== 'h') buf[y][x] = 'h'; }
      if (p.stripe) for (let i = 2; i < 15; i++) { const q = LP(p.hip, p.chest, i / 16), r = L(p.rh, p.rc, i / 16); set(X(q[0]), Y(q[1] - r * .35), 'P'); }
      leg(rootH, p.nhF, true, 'i'); if (!p.paws) leg(rootF, p.nfF, false, 'i');
      const hd = P2(p.head), nk = P2(p.neck), hr = 3.2 * S;
      seg(nk, [L(nk[0], hd[0], .5), L(nk[1], hd[1], .5)], 2 * S, 2.2 * S, 'i'); disc(hd[0], hd[1], hr, 'i');
      for (let y = Math.floor(hd[1] - hr - 1); y <= hd[1] + hr + 1; y++) for (let x = Math.floor(hd[0] - hr - 1); x <= hd[0] + hr + 1; x++) {
        if (y < 0 || y >= H || x < 0 || x >= W || buf[y][x] !== 'i') continue;
        const dy = y - hd[1], dx = x - hd[0]; if (dx * dx + dy * dy > hr * hr + .2) continue;
        if (dy < -hr * .55) buf[y][x] = 'l'; else if (big && dy < -hr * .2 && dx < 0) buf[y][x] = 'j'; else if (dy > hr * .6) buf[y][x] = 'h'; }
      const ear = (ex, far) => { for (let j = 0; j < (big ? 3 : 2); j++) for (let i = 0; i <= j * .7; i++)
        set(hd[0] + ex * S + i - j * (.35 + p.ears * .6), hd[1] - hr - (big ? 2.4 : 1.4) + j + p.ears * (big ? 1.5 : 1), (big && i > 0 && j > 1 && !far) ? 'Q' : far ? 'h' : 'i'); };
      ear(-2.2, true); ear(.6, false);
      const vy = hd[1] + p.tilt * S * .8;
      for (let y = vy - (big ? 1 : .5); y <= vy + (big ? 1 : .5); y++) for (let x = hd[0] + .3 * S; x <= hd[0] + 3.4 * S; x++) set(x, y, 'x');
      const ex = hd[0] + 2.2 * S, ey = vy - (big ? .3 : 0);
      if (p.eye === 'auf') { set(ex, ey, 'B'); if (big) set(ex + 1, ey, 'A'); }
      else if (p.eye === 'blinz') set(ex, ey, 'z');
      else if (p.eye === 'froh') { if (big) { set(ex - .5, ey, 'A'); set(ex + .5, ey - 1, 'B'); set(ex + 1.5, ey, 'A'); } else set(ex, ey - .5, 'A'); }
      else { set(ex, ey + (big ? .7 : .4), 'z'); if (big) set(ex + 1, ey + .7, 'z'); }
      set(hd[0] + 3.7 * S, hd[1] + 1.6 * S + p.tilt * S * .5, 'h');
      if (extra) extra(set, X, Y, big);
      if (p.paws) leg([p.chest[0] + 1, p.chest[1] + .5], p.nfF, false, 'i', 1);
      if (p.tailFront) drawTail();
      // Umriss g (4er-Nachbarschaft, wächst 1 px), dann Farbstufe anheben
      const rows = [];
      for (let y = -1; y <= H; y++) { let r = '';
        for (let x = -1; x <= W; x++) { const k = buf[y] && buf[y][x];
          if (k) r += UP[k] || k; else r += [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => buf[y + b] && buf[y + b][x + a]) ? 'g' : '.'; }
        rows.push(r); }
      return { rows, eye: p.eye === 'auf' ? { x: Math.round(ex) + 1, y: Math.round(ey) + 1 } : null };
    }
    const walkFoot = (k, x0, phase) => { const q = ((k / 8 + phase) % 1 + 1) % 1, A = 2.4;
      if (q < .6) return [x0 + A - 2 * A * q / .6, 18]; const t = (q - .6) / .4; return [x0 - A + 2 * A * ease(t), 18 - Math.sin(t * Math.PI) * 1.6]; };
    const sw = k => [-1, -.35, .35, 1][k];
    const KR = [[SIT, 0], [LIE, .45], [CURL, 1]], along = t => { for (let i = 0; i < 2; i++) { const [a, ta] = KR[i], [b, tb] = KR[i + 1]; if (t <= tb) return mix(a, b, ease((t - ta) / (tb - ta))); } return CURL; };
    const SK = [0, .15, .35, .55, .75, .9, 1, 1, 1, 1, 1, 1, 1, 1, .9, .75, .55, .35, .15, 0];
    const BALL = [[31, -5], [28, -4], [25, -1.5], [22, 2.5], null, null, null, null, [20, 15], [24, 17], [28, 17]], RK = [0, .3, .65, .95, 1, 1, .9, .55, .2, 0, 0];
    const DEF = {
      laufen: [8, 10, 0, (k, ph) => { const bob = KS < .8 ? 0 : Math.round(Math.max(0, Math.cos(ph * Math.PI * 4)) * .9) * .7, s = Math.sin(ph * Math.PI * 2);   /* v160: klein ohne Wippen, sonst flackert die Rückenkante */
        return { ...STAND, hip: [8, 9 + bob * .6], chest: [17, 9 + bob], head: [22.5, 5 + bob * .6], neck: [19, 7.5 + bob], tail: [[6, 8.5 + bob * .5], [2 + s * .4, 7], [2.5 + s * 1.2, 1.5]],
          nhF: walkFoot(k, 8.5, 0), nfF: walkFoot(k, 17.5, .25), fhF: walkFoot(k, 7, .5), ffF: walkFoot(k, 16, .75) }; }],
      stehen: [4, 3, 0, k => ({ ...STAND, tail: [[6, 8.5], [2 + sw(k) * .5, 7], [2.5 + sw(k) * 1.5, 1.5]] })],
      sitzen: [4, 3, 0, k => ({ ...SIT, tail: [[6, 16.5], [9, 19.5], [14 + sw(k) * .6, 17 - Math.abs(sw(k)) * .6]] })],
      blinzeln: [4, 3, 0, k => ({ ...SIT, eye: 'blinz', tail: [[6, 16.5], [9, 19.5], [14 + sw(k) * .6, 17 - Math.abs(sw(k)) * .6]] })],
      einrollen: [7, 7, 0, k => along(k / 6)],
      schlafen: [8, 4, 0, (k, ph) => { const b = (1 - Math.cos(ph * Math.PI * 2)) / 2; return { ...CURL, rh: 4.2 + b * .45, rc: 3.4 + b * .35, haunch: 4.6 + b * .45, tail: [[7, 17.4], [13, 20.6], [21.6, 17.6 - (k === 5 ? .6 : 0)]] }; }],
      aufstehen: [7, 7, 0, k => along(1 - k / 6)],
      schnurren: [8, 10, 0, (k, ph) => ({ p: { ...SIT, eye: 'froh', ears: .3, tail: [[6, 16.5], [9, 19.5], [14 + Math.sin(ph * 6.28) * .6, 17]] },
        extra: (set, X, Y) => { const w = Math.floor(k / 2) % 4; if (w === 3) return; const x0 = 19 + w * 1.6, c = w === 2 ? 'P' : 'Q'; set(X(x0), Y(10.2), c); set(X(x0 + .9), Y(11.4), c); set(X(x0), Y(12.6), c); } })],
      strecken: [SK.length, 7, 0, k => mix(STAND, STRETCH, ease(SK[k]))],
      ball: [RK.length, 9, 8, k => { const t = ease(RK[k]), p = mix(SIT, REAR, t);
        if (t > .4) { const dn = k >= 4 && k <= 7 ? (k - 4) * 1.2 : k > 7 ? 4 : 0; p.nfF = [p.head[0] + 4.2, p.head[1] + 4.6 + dn]; p.ffF = [p.head[0] + 5.2, p.head[1] + 3.4 + dn]; p.paws = 1; } else p.paws = 0;
        return { p, extra: (set, X, Y, big) => { const b = BALL[k] || [p.head[0] + 5.8, p.head[1] + 2.4 + (k - 4) * 1.2], cx = X(b[0]), cy = Y(b[1]), r = 1.6;
          if (!big) { set(cx, cy, 'w'); set(cx + 1, cy, 'v'); set(cx, cy + 1, 'v'); set(cx + 1, cy + 1, 'u'); return; }
          for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= r * r + .3) set(cx + x, cy + y, (x < 0 && y < 0) ? 'w' : y > 0 ? 'u' : 'v');
          set(cx, cy, 'E'); } }; }] };
    let KS = 1;
    return S => { KS = S; const big = S > .8, W = big ? 29 : 17, H0 = big ? 19 : 12, o = {};
      for (const [n, [cnt, fps, hoch, fn]] of Object.entries(DEF)) { const H = Math.ceil(H0 + hoch * S);
        o[n] = { fps, f: [...Array(cnt)].map((_, k) => { const r = fn(k, k / cnt); return draw(W, H, S, r.p || r, r.extra); }) }; }
      return o; };
  })();
  /* /KATZE-KERN */
  const CATF = {}, KPAL = Object.assign({}, PAL, { __flat: 1 });
  function robocat(S) { const key = S > .8 ? 1 : .6; if (CATF[key]) return CATF[key];
    const A = katzeAnims(key), o = {};
    for (const n in A) o[n] = Object.assign(A[n].f.map(f => Object.assign(buildSprite(f.rows, KPAL), { eye: f.eye })), { fps: A[n].fps });
    o.sit = o.sitzen; return (CATF[key] = o); }
  /* Verhalten: läuft zu einem Ziel, setzt sich, steht, rollt sich ab und zu zum Schlafen ein.
     Antippen (window.KATZE_TIPP): zufällig Schnurren, Strecken oder Ball fangen; schlafend steht sie erst auf. */
  function catStep(c, dt, time, x0, x1, speed, S) {
    const F = robocat(S), now = Date.now();
    if (c.x === undefined) Object.assign(c, { x: (x0 + x1) / 2, tx: x0 + 40, mode: 'walk', t: 0, dir: 1, dist: 0 });
    if (c.tip === undefined) c.tip = window.KATZE_TIPP || 0;
    const tip = window.KATZE_TIPP || 0;
    const play = (n, dauer) => { c.a = { n, t: 0, dauer }; const pan = typeof SFX !== 'undefined' ? SFX.panX(c.x) : 0;
      if (c.tipp && typeof SFX !== 'undefined') { if (n === 'schnurren') SFX.play('schnurr', { pan, vol: .9 }); if (n === 'strecken') SFX.play('servo', { pan, vol: .4 }); } };
    const next = () => { const q = c.q && c.q.shift(); if (q) { play(q[0], q[1]); c.mode = 'anim'; } else { c.a = null; c.tipp = false; c.mode = 'sit'; c.t = 2 + Math.random() * 3; } };
    if (tip > c.tip) { c.tip = tip;
      if (now - tip < 1000 && !(c.tipp && c.a)) { const r = ['schnurren', 'strecken', 'ball'][Math.floor(Math.random() * 3)];
        c.q = []; if (c.a && (c.a.n === 'schlafen' || c.a.n === 'einrollen')) c.q.push(['aufstehen']);
        c.q.push([r, r === 'schnurren' ? 3.2 : 0]); c.tipp = true; next(); } }
    if (c.mode === 'walk') { const d = c.tx - c.x; c.dir = Math.sign(d) || c.dir; const st = Math.min(Math.abs(d), speed * dt); c.x += c.dir * st; c.dist += st;
      if (Math.abs(d) < .5) { const r = Math.random();
        if (r < .42) { c.mode = 'sit'; c.t = 5 + Math.random() * 5; }
        else if (r < .72) { c.mode = 'stand'; c.t = 1.5 + Math.random() * 2.5; }
        else { c.q = [['einrollen'], ['schlafen', 15 + Math.random() * 20], ['aufstehen']]; next(); } } }
    else if (c.mode === 'anim') { const A = F[c.a.n]; c.a.t += dt;
      if (c.tipp && c.a.n === 'ball' && !c.a.klang && c.a.t * A.fps >= 4) { c.a.klang = 1; if (typeof SFX !== 'undefined') SFX.play('drop', { pan: SFX.panX(c.x), vol: .6 }); }
      if (c.a.dauer ? c.a.t >= c.a.dauer : c.a.t * A.fps >= A.length) next(); }
    else { c.t -= dt; if (c.t <= 0) { let nx; do nx = x0 + Math.random() * (x1 - x0); while (Math.abs(nx - c.x) < 40); c.tx = nx; c.mode = 'walk'; } }
    const sw = [0, 1, 2, 3, 2, 1][Math.floor(time * 3) % 6];
    let fr;
    if (c.mode === 'walk') fr = F.laufen[Math.floor(c.dist / (S > .8 ? 1 : .6)) % 8];
    else if (c.mode === 'anim') { const A = F[c.a.n], k = Math.floor(c.a.t * A.fps); fr = A[c.a.dauer ? k % A.length : Math.min(A.length - 1, k)]; }
    else if (c.mode === 'sit') fr = ((time % 3.7) < .15 ? F.blinzeln : F.sitzen)[sw];
    else fr = F.stehen[sw];
    return { fr, flip: c.dir < 0, x: Math.round(c.x) };
  }

  const gardenX = y => { const q = Math.max(0, Math.min(1, (y - UP) / (PROM - UP))), e2 = q * q * (3 - 2 * q); return 318 + 24 * e2 + 9 * Math.sin(q * Math.PI) * (1 - q * .4) + 3; };   // Mitte des Gartenwegs
  /* v155: Klang der Mecha-Arme (Werkshof und Kraftwerk): Faust heben oder senken = kurzes Dampfzischen;
     Arm zum Winken aus- oder einfahren (Stellung 3) = Gelenkmotor mit Zischen */
  /* v156: seltene Ereignisse (Flieger, Dampfer, Enten): je Runde c mit Wahrscheinlichkeit p, fest aus der Runde berechnet (alle Geräte gleich) */
  const selten = (k, c, p) => { let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) | 0; const v = Math.sin(c * 127.1 + h * .0137) * 43758.5453; return v - Math.floor(v) < p; };
  const MKL = {};
  function mechaKlang(id, p, x, elb) { if (!p) return; const o = MKL[id] || (MKL[id] = {}), snd = typeof SFX !== 'undefined', pan = snd ? SFX.panX(x || 200) : 0, now = Date.now();
    const arm = k => { const v = k === 'l' ? p.rL : p.rR; return v === undefined ? (p.raise || 0) : v; };
    for (const k of ['l', 'r']) { const v = arm(k), a = o[k] || 0; if (v !== a) { if (o.da) { if (snd) SFX.play(v === 3 || a === 3 ? 'einfahren' : 'zisch', { pan, vol: .8, gap: .12 }); if (elb && v !== 3 && a !== 3) { const e = elb(k === 'l' ? -1 : 1); dampf(e[0], e[1], k === 'l' ? -1 : 1); } } o[k] = v; } }
    /* v158: ab und zu ein kleiner Dampfstoß aus einem Ellenbogen, auch in Ruhe */
    if (elb && p.awake !== false) { if (!o.next) o.next = now + 3000 + Math.random() * 4000; if (now > o.next) { o.next = now + 6000 + Math.random() * 6000; const sd = Math.random() < .5 ? -1 : 1, e = elb(sd); dampf(e[0], e[1], sd); if (snd) SFX.play('zisch', { pan, vol: .35, gap: .3 }); } }
    o.da = true; }
  const MEXT = 50, mechaU = time => (time + 60) % (150 + MEXT);   /* gemeinsamer Zeitplan der Mecha-Wache (Werkshof und Kraftwerk), Periode 200 s, davon gut 80 s draußen */
  const mechaUi = time => { const u = mechaU(time); return u < 36 ? u : u < 36 + MEXT ? 36 : u - MEXT; };   /* fürs Kraftwerk: alter 150-s-Plan, die zusätzliche Zeit ist er draußen */
  return { dampf, staub, selten, mechaKlang, nebel, nebelHimmel, cachedLayer, kq, mechaU, mechaUi, MEXT, _loseAll: () => SPRITES.forEach(sp => { sp.c.getContext('2d').clearRect(0, 0, sp.c.width, sp.c.height); sp.f.getContext('2d').clearRect(0, 0, sp.f.width, sp.f.height); }), canvasLost, restoreAll, onRestore, PAINT, paintPal, OCC, glowPass, flame, wetter, wetterJetzt, wetK, wxHash, wetterHimmel, regen, CALM, EMBLEM, robocat, catStep, gardenX, POND, relight, tn, sBox, sCylV, sBall, PROM_X, RCY, BAY, UP, PATH_END, onPath, pathDip, PROM, FORKX, HILL0, HILL1, STAIR0, VERGE, W, H, G, ROAD, WATER, PAL, R, mk, mix, hx, rgb, rng, buildSprite, blit, BUILD, SPR, skyAt, tint, glow, backdrop, ground, water, hillH, flies, parts, puff, stepParts, Grid, fill, brickWall, corrugated, windowAt, door, sh, RAMP };
})();
